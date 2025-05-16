import { createClient } from "./server"

//user functions

export async function getAllUsers() {
    const supabase = await createClient()

    const { data, error } = await supabase.from("users").select("*")

    if (error) {
        console.error("getUserByPrivyId error:", error)
        return null
    }

    return data
}

export async function getUserByPrivyId(privyId: string) {
    console.log("Supabase: ")
    const supabase = await createClient()
    //console.log("Supabase: ", supabase)

    const { data, error } = await (await supabase).from("users").select("*").eq("privy_id", privyId).single()

    if (error && error.code !== "PGRST116") {
        // Log only if it's not "no rows found"
        console.error("Error fetching user by privy_id:", error.message)
    }

    return data // returns null if no user found
}

export async function insertUser({ privyId, walletAddress }: { privyId: string; walletAddress: string }) {
    console.log("Supabase: ")
    const supabase = await createClient()
    //console.log("Supabase: ", supabase)
    const { error } = await supabase.from("users").insert({
        privy_id: privyId,
        wallet_address: walletAddress,
    })
    //.select().single()

    if (error) {
        console.error("Error inserting user:", error.message)
        return false
    }

    return true
}

//lootbox functions

export async function getLootboxesByPrivyId(privyId: string) {
    const supabase = await createClient()

    // const { data: user, error: userError } = await supabase.from("users").select("id").eq("privy_id", privyId).single()

    // if (userError) {
    //     console.error("Error fetching user:", userError.message)
    //     return null
    // }

    // const { data: lootboxes, error: lootboxError } = await supabase
    //     .from("lootbox")
    //     .select("*")
    //     .eq("user_id", user.id)
    //     .order("bought_At", { ascending: false })

    const { data, error } = await supabase
        .from("lootbox")
        .select("*, users!inner(id)") // Join where users.id = lootbox.user_id
        .eq("users.privy_id", privyId)
        .order("bought_at", { ascending: false })

    if (error) {
        console.error("Error fetching lootboxes:", error.message)
        return null
    }

    return data
}

export async function insertLootbox(payload: {
    user_id: string
    payment_token: string
    price_usd: number
    number_of_packs: number
    pack_type: string
    txn_hash: string
}) {
    const supabase = await createClient()

    const { error } = await supabase.from("lootbox").insert([
        {
            bought_at: new Date().toISOString(),
            ...payload,
        },
    ])

    if (error) {
        console.error("insertLootbox error:", error)
        return false
    }

    return true
}
