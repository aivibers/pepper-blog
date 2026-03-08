(function initSoundLogic(root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
    return;
  }

  root.SoundLogic = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function soundLogicFactory() {
  function shouldResumeAudioContext(audioContextState) {
    return audioContextState === 'suspended';
  }

  function canPlayBeep(soundOn, audioUnlocked) {
    return Boolean(soundOn && audioUnlocked);
  }

  function selfTestTonePlan() {
    return [
      { atMs: 0, frequency: 440, duration: 0.05, type: 'triangle', volume: 0.035 },
      { atMs: 110, frequency: 560, duration: 0.05, type: 'triangle', volume: 0.035 },
      { atMs: 220, frequency: 680, duration: 0.06, type: 'triangle', volume: 0.04 },
    ];
  }

  return {
    shouldResumeAudioContext,
    canPlayBeep,
    selfTestTonePlan,
  };
});
