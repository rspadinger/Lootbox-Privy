"use server"

import { getLootboxesByPrivyId, insertLootbox } from "@/lib/supabase/actions"

export async function getLootboxesByPrivyIdAction(privyId: string) {
    const lootboxes = await getLootboxesByPrivyId(privyId)
    return lootboxes
}

export async function insertLootboxAction(
    user_id: string,
    payment_token: string,
    price_usd: number,
    number_of_packs: number,
    pack_type: string,
    txn_hash: string
) {
    const success = await insertLootbox({
        user_id,
        payment_token,
        price_usd,
        number_of_packs,
        pack_type,
        txn_hash,
    })

    return { success }
}
