class Pcm16CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.targetSampleRate = options.processorOptions?.targetSampleRate ?? 16000
    this.frameSamples = options.processorOptions?.frameSamples ?? 320
    this.position = 0
    this.frame = new Float32Array(this.frameSamples)
    this.frameIndex = 0
    this.stopped = false
    this.port.onmessage = (event) => {
      if (event.data?.type === 'stop') this.stopped = true
    }
  }

  process(inputs) {
    if (this.stopped) return false
    const input = inputs[0]?.[0]
    if (!input || input.length === 0) return true
    const ratio = sampleRate / this.targetSampleRate
    let position = this.position
    while (position < input.length) {
      const leftIndex = Math.min(Math.floor(position), input.length - 1)
      const rightIndex = Math.min(leftIndex + 1, input.length - 1)
      const fraction = position - leftIndex
      const sample = input[leftIndex] + (input[rightIndex] - input[leftIndex]) * fraction
      this.frame[this.frameIndex] = sample
      this.frameIndex += 1
      if (this.frameIndex === this.frameSamples) this.flush()
      position += ratio
    }
    this.position = position - input.length
    return true
  }

  flush() {
    const pcm = new Int16Array(this.frameSamples)
    for (let index = 0; index < this.frameSamples; index += 1) {
      const clipped = Math.max(-1, Math.min(1, this.frame[index]))
      pcm[index] = clipped < 0 ? Math.round(clipped * 0x8000) : Math.round(clipped * 0x7fff)
    }
    this.port.postMessage({ type: 'pcm16', pcm: pcm.buffer }, [pcm.buffer])
    this.frame = new Float32Array(this.frameSamples)
    this.frameIndex = 0
  }
}

registerProcessor('pcm16-capture', Pcm16CaptureProcessor)
