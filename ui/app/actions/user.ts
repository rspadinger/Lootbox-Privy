// app/actions/user.ts
"use server"

import { getUserByPrivyId, insertUser, getAllUsers } from "@/lib/supabase/actions"

export async function getAllUsersAction() {
    const users = await getAllUsers()
    return users
}

export async function getUserByPrivyIdAction(privyId: string) {
    const user = await getUserByPrivyId(privyId)
    return user
}

export async function getUserIdAction(privyId: string) {
    const user = await getUserByPrivyIdAction(privyId)
    return user.id
}

export async function insertUserAction(privyId: string, walletAddress: string) {
    const existingUser = await getUserByPrivyId(privyId)
    if (existingUser) return null //user is already in DB

    const userInserted = await insertUser({ privyId, walletAddress })
    return userInserted
}
