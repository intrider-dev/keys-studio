import threading
import unittest
from unittest.mock import Mock

from server import MidiBridge


class MidiBridgeTests(unittest.TestCase):
    def bridge(self):
        bridge = MidiBridge.__new__(MidiBridge)
        bridge.lock = threading.RLock()
        bridge.output = 1
        bridge.scheduled = []
        return bridge

    def test_output_failure_closes_stale_connection(self):
        bridge = self.bridge()
        bridge.api = Mock()
        bridge.api.midiOutShortMsg.return_value = 6
        bridge.close = Mock()
        with self.assertRaisesRegex(RuntimeError, 'Переподключить MIDI'):
            bridge.send(0x90, 60, 65)
        bridge.close.assert_called_once()
        self.assertIn('код 6', bridge.error)

    def test_invalid_chord_never_sends_partial_notes(self):
        bridge = self.bridge()
        bridge.send = Mock()
        with self.assertRaises(ValueError):
            bridge.play([{'pitch': 60}, {'pitch': 999}])
        bridge.send.assert_not_called()
        self.assertEqual(bridge.scheduled, [])

    def test_chord_schedules_each_note_release(self):
        bridge = self.bridge()
        bridge.send = Mock()
        bridge.play([{'pitch': 60}, {'pitch': 64, 'channel': 1}])
        self.assertEqual(bridge.send.call_count, 2)
        self.assertEqual([note[1] for note in bridge.scheduled], [60, 64])


if __name__ == '__main__':
    unittest.main()
