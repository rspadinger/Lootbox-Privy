"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
// @ts-expect-error working fine
import { http } from "wagmi"
import { mainnet, sepolia } from "viem/chains"

import type { PrivyClientConfig } from "@privy-io/react-auth"
import { PrivyProvider } from "@privy-io/react-auth"
import { WagmiProvider, createConfig } from "@privy-io/wagmi"

const queryClient = new QueryClient()

export const wagmiConfig = createConfig({
    chains: [sepolia], //mainnet
    transports: {
        // [mainnet.id]: http(`${process.env.NEXT_PUBLIC_ALCHEMY_MAINNET}`),
        [sepolia.id]: http(`${process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA}`),
    },
})

export const privyConfig: PrivyClientConfig = {
    embeddedWallets: {
        createOnLogin: "users-without-wallets",
        requireUserPasswordOnCreate: true,
        showWalletUIs: true,
    },
    loginMethods: ["wallet", "email", "google", "github"], // "sms"
    appearance: {
        showWalletLoginFirst: true,
        theme: "dark",
    },
}

export default function PrivyProviders({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
            config={privyConfig}
        >
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
                    {children}
                </WagmiProvider>
            </QueryClientProvider>
        </PrivyProvider>
    )
}
