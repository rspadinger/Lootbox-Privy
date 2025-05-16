import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export const useEthPrice = () => {
    //use SWR to cache he result for 60 seconds
    const { data, error } = useSWR(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&_cg_pro_api_key=CG-LbfXKykdax1boy1P7eYSB861",
        fetcher,
        {
            refreshInterval: 60000, // re-fetch every 60s => automatically re-fetches the ETH price every 60 seconds
            dedupingInterval: 60000, // avoid duplicate fetches during 60s
        }
    )

    if (error) {
        console.error("ETH price fetch error:", error)
        return null
    }

    return data?.ethereum?.usd ?? null
}
