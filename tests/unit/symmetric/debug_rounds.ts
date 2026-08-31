import { encrypt, decrypt } from '../../lib/cipher/symmetric/hierocrypt3'

const key = '11223344556677889900aabbccddeeff'
const pt = '00112233445566778899aabbccddeeff'

const encRes = encrypt(pt, key, { instrument: true })
console.log('--- ENCRYPTION STEPS ---')
encRes.steps.forEach(s => {
    console.log(`${s.label}: input=${s.inputState}, output=${s.outputState}`);
})

console.log('--- DECRYPTION ---')
const decRes = decrypt(encRes.output, key, { instrument: true })
console.log('--- DECRYPTION STEPS ---')
decRes.steps.forEach(s => {
    console.log(`${s.label}: input=${s.inputState}, output=${s.outputState}`);
})
