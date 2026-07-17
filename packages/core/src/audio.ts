const MU_LAW_BIAS = 0x84

export function decodeMuLaw(payload: Uint8Array): Int16Array {
  const pcm = new Int16Array(payload.length)

  for (let index = 0; index < payload.length; index += 1) {
    const inverted = ~(payload[index] ?? 0) & 0xff
    const sign = inverted & 0x80
    const exponent = (inverted >> 4) & 0x07
    const mantissa = inverted & 0x0f
    const magnitude = ((mantissa << 3) + MU_LAW_BIAS) << exponent
    pcm[index] = sign === 0 ? magnitude - MU_LAW_BIAS : MU_LAW_BIAS - magnitude
  }

  return pcm
}

export function resamplePcm16(input: Int16Array, fromRate: number, toRate: number): Int16Array {
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) {
    throw new Error('sample rate must be a positive finite number')
  }

  if (input.length === 0) {
    return new Int16Array()
  }

  if (fromRate === toRate) {
    return Int16Array.from(input)
  }

  const outputLength = Math.max(1, Math.round((input.length * toRate) / fromRate))
  const output = new Int16Array(outputLength)

  for (let index = 0; index < outputLength; index += 1) {
    const position = (index * fromRate) / toRate
    const leftIndex = Math.min(Math.floor(position), input.length - 1)
    const rightIndex = Math.min(leftIndex + 1, input.length - 1)
    const fraction = position - leftIndex
    const left = input[leftIndex] ?? 0
    const right = input[rightIndex] ?? left
    output[index] = Math.round(left + (right - left) * fraction)
  }

  return output
}
