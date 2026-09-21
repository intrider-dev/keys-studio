from pathlib import Path
import mido
root=Path(__file__).parent
mid=mido.MidiFile(ticks_per_beat=480)
track=mido.MidiTrack();mid.tracks.append(track)
track.append(mido.MetaMessage('track_name',name='Right hand'))
track.append(mido.MetaMessage('set_tempo',tempo=500000))
for note in [60,62,64,67]:
    track.append(mido.Message('note_on',note=note,velocity=75))
    track.append(mido.Message('note_off',note=note,velocity=0,time=480))
mid.save(root/'practice-test.mid')
