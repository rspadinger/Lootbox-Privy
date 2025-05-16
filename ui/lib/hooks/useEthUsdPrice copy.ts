import { useEffect, useState } from "react"

export const useEthPrice = () => {
    const [ethPrice, setEthPrice] = useState<number | null>(null)

    useEffect(() => {
        const fetchEthPrice = async () => {
            try {
                const res = await fetch(
                    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&_cg_pro_api_key=CG-LbfXKykdax1boy1P7eYSB861"
                )
                const data = await res.json()
                setEthPrice(data.ethereum.usd)
            } catch (err) {
                console.error("Failed to fetch ETH price", err)
            }
        }

        fetchEthPrice()
        const interval = setInterval(fetchEthPrice, 30000)
        return () => clearInterval(interval)
    }, [])

    return ethPrice
}
