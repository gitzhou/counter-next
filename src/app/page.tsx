'use client'

import Image from 'next/image'

import { Scrypt, bsv, ContractCalledEvent, SensiletSigner, ScryptProvider } from 'scrypt-ts';
import { Counter } from '../contracts/counter';

import React, { useState, useRef, useEffect } from 'react';

var artifact = require('../../artifacts/counter.json')
Counter.loadArtifact(artifact)

Scrypt.init({
  apiKey: 'testnet_3OJHoUTWnhTtVGck0T6ZpV2Cx3lcLw0UchOfl4aPtfA8D10Kf',
  network: bsv.Networks.testnet,
})

const contractId = {
  txId: 'fdc5218259b0d8b2127873537339d58b7c8c1e19f0859b6bc3d3549d48d64a3c',
  outputIndex: 0,
}

export default function Home() {

  const [instance, setInstance] = useState<Counter | null>(null)
  const signerRef = useRef<SensiletSigner | null>(null)

  async function fetchInstance() {
    try {
      const counter = await Scrypt.contractApi.getLatestInstance(Counter, contractId)
      setInstance(counter)
    } catch (e: any) {
      console.log(`Fetch instance error: ${e}`)
    }
  }

  useEffect(() => {
    // only initialize the SensiletSigner on the client side
    signerRef.current = new SensiletSigner(new ScryptProvider())

    fetchInstance()
    const subscription = Scrypt.contractApi.subscribe({
      clazz: Counter,
      id: contractId,
    }, (event: ContractCalledEvent<Counter>) => {
      const txId = event.tx.id
      console.log(`Counter increment: ${txId}`)
      setInstance(event.nexts[0])
    })
    return () => { subscription.unsubscribe() }
  }, [])

  async function increment() {
    const signer = signerRef.current as SensiletSigner
    if (instance && signer) {
      const { isAuthenticated, error } = await signer.requestAuth()
      if (!isAuthenticated) {
        throw new Error(error)
      }
      await instance.connect(signer)

      const nextInstance = instance.next()
      nextInstance.count++

      instance.methods.increment({
        next: {
          instance: nextInstance,
          balance: instance.balance
        }
      }).catch(e => {
        console.log(`Counter call error: ${e}`)
        fetchInstance()
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <Image src="/next.svg" alt="Next.js Logo" width={180} height={37} priority />

      <h1 style={{ fontSize: '28px', textAlign: 'center', marginTop: '60px', marginBottom: '20px' }}>
        Counter now is {instance?.count.toString()}
      </h1>
      <button onClick={increment}>Increment</button>
    </div>
  )

}
