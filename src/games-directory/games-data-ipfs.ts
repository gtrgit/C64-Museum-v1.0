// Option to use IPFS or Decentraland's content delivery
export async function loadFromIPFS(hash: string): Promise<any> {
  const ipfsGateways = [
    `https://ipfs.io/ipfs/${hash}`,
    `https://cloudflare-ipfs.com/ipfs/${hash}`,
    `https://gateway.pinata.cloud/ipfs/${hash}`
  ]
  
  for (const gateway of ipfsGateways) {
    try {
      const response = await fetch(gateway)
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      continue
    }
  }
  
  throw new Error('Failed to load from IPFS')
}

// You could upload your JSON to IPFS and use it like:
// const data = await loadFromIPFS('QmYourIPFSHashHere')