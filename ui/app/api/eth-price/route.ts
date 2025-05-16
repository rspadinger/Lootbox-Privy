import { NextResponse } from "next/server"

//https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&_cg_pro_api_key=CG-LbfXKykdax1boy1P7eYSB861

export async function GET() {
    try {
        const res = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&_cg_pro_api_key=CG-LbfXKykdax1boy1P7eYSB861"
        )
        const data = await res.json()
        return NextResponse.json(data)
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch ETH price" }, { status: 500 })
    }
}
