import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN

function isAdmin(request: NextRequest) {
    const authHeader = request.headers.get("authorization") || ""
    return authHeader === `Bearer ${ADMIN_TOKEN}`
}

export async function GET() {
    const { data, error } = await supabaseAdmin.from("package").select("*")

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
    if (!isAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, price } = body

    if (!name || price == null) {
        return NextResponse.json({ error: "Missing name or price" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.from("package").insert([{ name, price }]).select()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
        return NextResponse.json({ error: "Insert failed, no data returned" }, { status: 500 })
    }

    return NextResponse.json(data[0], { status: 201 })
}

export async function PUT(request: NextRequest) {
    if (!isAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, price } = body

    if (!id || !name || price == null) {
        return NextResponse.json({ error: "Missing id, name or price" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.from("package").update({ name, price }).eq("id", id).select()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
        return NextResponse.json({ error: "Update failed, no data returned" }, { status: 500 })
    }

    return NextResponse.json(data[0])
}

export async function DELETE(request: NextRequest) {
    if (!isAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from("package").delete().eq("id", id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Deleted successfully" })
}
