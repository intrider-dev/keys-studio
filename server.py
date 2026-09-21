"""Local MIDI input bridge and static application server."""
import ctypes as c
from ctypes import wintypes as w
from collections import deque
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json
import threading
import time
import atexit

ROOT=Path(__file__).parent
PORT=8765
class InCaps(c.Structure):
    _fields_=[('manufacturer',w.WORD),('product',w.WORD),('version',w.DWORD),('name',w.WCHAR*32),('support',w.DWORD)]
class OutCaps(c.Structure):
    _fields_=[('manufacturer',w.WORD),('product',w.WORD),('version',w.DWORD),('name',w.WCHAR*32),('technology',w.WORD),('voices',w.WORD),('notes',w.WORD),('channels',w.WORD),('support',w.DWORD)]

class MidiBridge:
    def __init__(self):
        self.api=c.WinDLL('winmm');self.input=w.HANDLE();self.output=w.HANDLE();self.name=None;self.error=None
        self.cv=threading.Condition();self.lock=threading.RLock();self.queue=deque(maxlen=2048);self.serial=0;self.count=0
        self.last_note=None;self.last_event=None;self.scheduled=[]
        for kind,caps in [('In',InCaps),('Out',OutCaps)]:
            getattr(self.api,f'midi{kind}GetDevCapsW').argtypes=[c.c_size_t,c.POINTER(caps),w.UINT]
            getattr(self.api,f'midi{kind}Open').argtypes=[c.POINTER(w.HANDLE),w.UINT,c.c_size_t,c.c_size_t,w.DWORD]
            getattr(self.api,f'midi{kind}Close').argtypes=[w.HANDLE]
        for op in ['midiInStart','midiInStop','midiInReset','midiOutReset']:getattr(self.api,op).argtypes=[w.HANDLE]
        self.api.midiOutShortMsg.argtypes=[w.HANDLE,w.DWORD]
        callback_type=c.WINFUNCTYPE(None,w.HANDLE,w.UINT,c.c_size_t,c.c_size_t,c.c_size_t)
        self.callback=callback_type(self.receive)
        self.connect()
        threading.Thread(target=self.scheduler,daemon=True).start()
    def devices(self,kind):
        result=[];caps_type=InCaps if kind=='In' else OutCaps
        for i in range(getattr(self.api,f'midi{kind}GetNumDevs')()):
            caps=caps_type()
            if getattr(self.api,f'midi{kind}GetDevCapsW')(i,c.byref(caps),c.sizeof(caps))==0:result.append({'id':i,'name':caps.name})
        return result
    def receive(self,handle,message,instance,param1,param2):
        if message not in (0x3C3,0x3CC):return
        status=param1&255;a=(param1>>8)&127;b=(param1>>16)&127;kind=status&240
        if kind not in (0x80,0x90,0xB0):return
        event={'type':'on' if kind==0x90 and b else 'off' if kind in (0x80,0x90) else 'control','note':a,'velocity':b,'channel':status&15,'timestamp':time.time()*1000}
        with self.cv:
            self.serial+=1;event['id']=self.serial;self.queue.append(event);self.last_event=event['timestamp']
            if event['type']=='on':self.count+=1;self.last_note=a
            self.cv.notify_all()
    def connect(self):
        with self.lock:
            self.close();self.error=None
            inputs=self.devices('In');outputs=self.devices('Out')
            found=next((d for d in inputs if 'keyboard' in d['name'].lower() or 'yamaha' in d['name'].lower()),None)
            if not found:self.error='Подключите Yamaha кабелем USB и нажмите «Подключить».';return
            code=self.api.midiInOpen(c.byref(self.input),found['id'],c.cast(self.callback,c.c_void_p).value,0,0x30000)
            if code:self.input=w.HANDLE();self.error=f'Не удалось открыть MIDI-вход (код {code}). Закройте другие музыкальные программы.';return
            code=self.api.midiInStart(self.input)
            if code:self.error=f'Не удалось начать приём MIDI (код {code}).';self.close();return
            self.name=found['name']
            out=next((d for d in outputs if d['name']==found['name']),None)
            if out:
                code=self.api.midiOutOpen(c.byref(self.output),out['id'],0,0,0)
                if code:self.output=w.HANDLE()
            if self.output:
                for ch in (0,1):
                    for status,a,b in [(0xB0|ch,0,0),(0xB0|ch,32,112),(0xC0|ch,1,0)]:self.send(status,a,b)
    def send(self,status,a,b):
        if self.output:
            result=self.api.midiOutShortMsg(self.output,status|(a<<8)|(b<<16))
            if result:raise RuntimeError(f'MIDI output error {result}')
    def panic(self):
        with self.lock:
            self.scheduled.clear()
            if self.output:
                for ch in (0,1):
                    self.send(0xB0|ch,64,0);self.send(0xB0|ch,123,0);self.send(0xB0|ch,120,0)
    def instrument(self,program):
        program=int(program)
        if not 0<=program<=127:raise ValueError('Invalid program')
        with self.lock:
            if not self.output:raise RuntimeError('MIDI output unavailable')
            self.panic()
            for ch in (0,1):
                self.send(0xB0|ch,0,0);self.send(0xB0|ch,32,0);self.send(0xC0|ch,program,0)
    def play(self,notes):
        with self.lock:
            if not self.output:raise RuntimeError('MIDI-выход Yamaha недоступен')
            now=time.monotonic()
            for n in notes[:128]:
                pitch=int(n['pitch']);velocity=int(n.get('velocity',65));channel=int(n.get('channel',0));duration=float(n.get('duration',.3))
                if not 0<=pitch<=127 or not 0<=velocity<=100 or channel not in (0,1) or not .01<=duration<=30:raise ValueError('Invalid MIDI note')
                self.send(0x90|channel,pitch,velocity);self.scheduled.append((now+duration,pitch,channel))
    def scheduler(self):
        while True:
            with self.lock:
                now=time.monotonic();future=[]
                for end,pitch,ch in self.scheduled:
                    if end<=now:
                        try:self.send(0x80|ch,pitch,0)
                        except RuntimeError:pass
                    else:future.append((end,pitch,ch))
                self.scheduled=future
            time.sleep(.005)
    def status(self):return {'connected':bool(self.input),'output':bool(self.output),'name':self.name,'error':self.error,'received':self.count,'lastNote':self.last_note,'lastEvent':self.last_event}
    def close(self):
        if self.input:self.api.midiInStop(self.input);self.api.midiInReset(self.input);self.api.midiInClose(self.input);self.input=w.HANDLE()
        if self.output:self.api.midiOutReset(self.output);self.api.midiOutClose(self.output);self.output=w.HANDLE()
        self.name=None;self.scheduled=[]

bridge=MidiBridge();atexit.register(bridge.close)
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'dist'),**kwargs)
    def log_message(self,*args):pass
    def respond(self,value,status=200):
        raw=json.dumps(value,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw)
    def do_GET(self):
        if self.path=='/api/status':return self.respond(bridge.status())
        if self.path=='/api/events':
            self.send_response(200);self.send_header('Content-Type','text/event-stream');self.send_header('Cache-Control','no-cache');self.send_header('Connection','keep-alive');self.end_headers()
            last=bridge.serial
            try:
                self.wfile.write(b': connected\n\n');self.wfile.flush()
                while True:
                    with bridge.cv:
                        events=[e for e in bridge.queue if e['id']>last]
                        if not events:bridge.cv.wait(1);events=[e for e in bridge.queue if e['id']>last]
                    if events:
                        for e in events:self.wfile.write(('data: '+json.dumps(e)+'\n\n').encode());last=e['id']
                    else:self.wfile.write(b': heartbeat\n\n')
                    self.wfile.flush()
            except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass
            return
        return super().do_GET()
    def do_POST(self):
        # Only the local application may operate the MIDI output.
        origin=self.headers.get('Origin')
        if origin and origin not in (f'http://127.0.0.1:{PORT}',f'http://localhost:{PORT}'):return self.respond({'error':'Origin rejected'},403)
        try:
            size=int(self.headers.get('Content-Length','0'))
            if size>65536:raise ValueError('Request too large')
            body=json.loads(self.rfile.read(size) or b'{}')
            if self.path=='/api/connect':bridge.connect();return self.respond(bridge.status())
            if self.path=='/api/panic':bridge.panic();return self.respond({'ok':True})
            if self.path=='/api/instrument':bridge.instrument(body.get('program',0));return self.respond({'ok':True})
            if self.path=='/api/play':bridge.play(body.get('notes',[]));return self.respond({'ok':True})
            return self.respond({'error':'Not found'},404)
        except Exception as e:return self.respond({'error':str(e)},400)

if __name__=='__main__':
    print(f'Piano trainer: http://127.0.0.1:{PORT}',flush=True)
    print(json.dumps(bridge.status(),ensure_ascii=True),flush=True)
    ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()
