import React, { useEffect, useRef, useState } from 'react'
import { LogOut, MessageCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore, selectUser, selectIsLoading } from '@/stores/auth-store'

interface MenuItem {
    label: string
    icon: React.ReactNode
    active?: boolean
    onClick?: () => void
}

interface DashboardShellProps {
    title: string
    subtitle: string
    roleLabel: string
    menuItems: MenuItem[]
    actions?: React.ReactNode
    onLogout?: () => void
    onProfileClick?: () => void
    children: React.ReactNode
}

type CopilotMessage = {
    id: number
    sender: 'user' | 'assistant'
    text: string
}

const DashboardShell: React.FC<DashboardShellProps> = ({
    title,
    subtitle,
    roleLabel,
    menuItems,
    actions,
    onLogout,
    onProfileClick,
    children,
}) => {
    const [miniChatOpen, setMiniChatOpen] = useState(false)
    const [miniChatMessages, setMiniChatMessages] = useState<CopilotMessage[]>([
        {
            id: 1,
            sender: 'assistant',
            text: 'I am the Copilot who can surface insights from Overview, Campaign, SEO, E-commerce, and CRM in seconds—ask me anything.',
        },
    ])
    const [miniChatInput, setMiniChatInput] = useState('')
    const [miniChatTyping, setMiniChatTyping] = useState(false)
    const miniChatScrollRef = useRef<HTMLDivElement | null>(null)

    // Draggable FAB state
    const [isDragging, setIsDragging] = useState(false)
    const [fabPosition, setFabPosition] = useState({ x: 0, y: 0 })
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const fabRef = useRef<HTMLDivElement>(null)

    // ✅ Use Zustand store
    const user = useAuthStore(selectUser)
    const isLoading = useAuthStore(selectIsLoading)

    // Map user fields to display
    const displayName = user?.name || user?.email || 'Guest'
    const displayEmail = user?.email || '—'
    const displayTitle = user?.role || '—'
    const displayTeam = user?.companyName || '—'

    useEffect(() => {
        if (miniChatScrollRef.current) {
            miniChatScrollRef.current.scrollTop = miniChatScrollRef.current.scrollHeight
        }
    }, [miniChatMessages, miniChatTyping])

    // Draggable FAB handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        // Store the mouse position relative to the FAB's current position
        const rect = fabRef.current?.getBoundingClientRect()
        if (rect) {
            setDragStart({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            })
        }
    }

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return

        // Calculate new position based on mouse position and drag offset
        const newX = e.clientX - dragStart.x
        const newY = e.clientY - dragStart.y

        // Get FAB dimensions for precise boundary calculation
        const fabWidth = 280 // approximate FAB width (button + text)
        const fabHeight = 60 // approximate FAB height

        // Calculate viewport boundaries
        const minX = 10 // 10px padding from left
        const minY = 10 // 10px padding from top
        const maxX = window.innerWidth - fabWidth - 10 // 10px padding from right
        const maxY = window.innerHeight - fabHeight - 10 // 10px padding from bottom

        // Keep FAB within viewport bounds
        const boundedX = Math.max(minX, Math.min(newX, maxX))
        const boundedY = Math.max(minY, Math.min(newY, maxY))

        // Calculate the transform values relative to the original bottom-right position
        const originalRight = 32 // 2rem = 32px
        const originalBottom = 32 // 2rem = 32px

        setFabPosition({
            x: boundedX - (window.innerWidth - originalRight - fabWidth),
            y: boundedY - (window.innerHeight - originalBottom - fabHeight)
        })
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            return () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
            }
        }
    }, [isDragging, dragStart])

    const clearChatHistory = () => {
        setMiniChatMessages([
            {
                id: 1,
                sender: 'assistant',
                text: 'I am the Copilot who can surface insights from Overview, Campaign, SEO, E-commerce, and CRM in seconds—ask me anything.',
            },
        ])
        setMiniChatInput('')
    }

    const buildCopilotResponse = (prompt: string) => {
        const normalized = prompt.toLowerCase()
        if (normalized.includes('overview')) {
            return 'The Overview Dashboard surfaces real-time KPIs, hero cards, and trend charts the leadership team monitors each day.'
        }
        if (normalized.includes('campaign')) {
            return 'Campaign Performance highlights current campaign status, conversion funnels, and the channels driving the strongest ROI.'
        }
        if (normalized.includes('seo') || normalized.includes('web')) {
            return 'SEO & Web Analytics reveals organic performance, traffic sources, and search-driven conversions in detail.'
        }
        if (normalized.includes('commerce') || normalized.includes('product') || normalized.includes('video')) {
            return 'E-commerce Insights combines product video stats, creative cards, revenue trends, and conversion funnels in one view.'
        }
        if (normalized.includes('crm') || normalized.includes('lead')) {
            return 'CRM & Leads surfaces pipeline health, lead quality, and sales activities so you know which stage to focus on next.'
        }
        return 'I can describe any dashboard section or call out KPIs worth watching—drop your question and I will guide you.'
    }

    const handleMiniChatSend = () => {
        const trimmed = miniChatInput.trim()
        if (!trimmed) return
        const userMessage: CopilotMessage = { id: Date.now(), sender: 'user', text: trimmed }
        setMiniChatMessages((prev) => [...prev, userMessage])
        setMiniChatInput('')
        setMiniChatTyping(true)
        setTimeout(() => {
            const reply: CopilotMessage = {
                id: Date.now() + 1,
                sender: 'assistant',
                text: buildCopilotResponse(trimmed),
            }
            setMiniChatMessages((prev) => [...prev, reply])
            setMiniChatTyping(false)
        }, 700)
    }

    const handleMiniChatKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault()
            handleMiniChatSend()
        }
    }

    return (
        <div className="min-h-screen bg-[#fdf6f0] flex">
            <aside className="hidden xl:flex flex-col w-64 2xl:w-72 bg-gradient-to-b from-[#1a1612] to-[#2d2420] text-white px-6 py-4 space-y-6 sticky top-0 h-screen overflow-y-auto no-scrollbar">
                <div className="flex-shrink-0">
                    <p className="text-2xl font-black tracking-tight leading-none text-orange-400">RGA</p>
                    <p className="text-xs text-orange-200 tracking-wider uppercase">Rise Group Asia</p>
                </div>
                <div className="rounded-2xl p-5 space-y-3 shadow-inner bg-[#1a1612] border border-orange-900/30 flex-shrink-0">
                    <p className="text-xs uppercase text-orange-100 tracking-wider mb-3">Profile</p>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl overflow-hidden bg-white/10">
                            <div className="h-full w-full flex items-center justify-center text-lg font-bold">
                                {displayName.charAt(0)}
                            </div>
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-base font-semibold text-white/95 leading-snug mt-3">
                                {isLoading ? 'Loading…' : displayName}
                            </p>
                            <p className="text-sm text-orange-50/90 leading-tight">{isLoading ? 'Please wait' : displayTitle}</p>
                        </div>
                    </div>
                    <div className="space-y-1 text-white/90 leading-relaxed" style={{ fontSize: '15px' }}>
                        <p className="truncate text-orange-300 leading-tight" style={{ fontSize: '15px' }}>{displayEmail}</p>
                        <p className="text-white leading-tight" style={{ fontSize: '18px' }}>Team: {displayTeam}</p>
                    </div>
                    <button
                        className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-sm font-semibold text-black hover:opacity-90 transition"
                        onClick={onProfileClick}
                    >
                        View full profile
                    </button>
                </div>
                <nav className="flex-1 flex flex-col min-h-0">
                    <div className="space-y-2 overflow-y-auto no-scrollbar -mx-2 px-2 pb-4">
                        {menuItems.map((item) => (
                            <button
                                key={item.label}
                                className={cn(
                                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left text-sm font-semibold tracking-wide flex-shrink-0',
                                    item.active ? 'bg-white text-gray-900 shadow-lg' : 'text-orange-300 hover:bg-orange-900/20'
                                )}
                                onClick={item.onClick}
                            >
                                <span className="text-lg">{item.icon}</span>
                                <span className="truncate">{item.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-auto pt-4 border-t border-orange-900/30">
                        <button
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide text-orange-200 hover:bg-orange-900/20 transition"
                            onClick={onLogout}
                        >
                            <LogOut className="h-4 w-4" />
                            Log out
                        </button>
                    </div>
                </nav>
            </aside>

            <main className="flex-1 p-6 lg:p-10 space-y-8 overflow-x-hidden w-full">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-1 min-w-0">
                        <p className="text-xs uppercase text-gray-500 tracking-[0.3em]">{roleLabel}</p>
                        <h1 className="text-2xl font-semibold text-gray-900 break-words">{title}</h1>
                        <p className="text-base text-gray-500 max-w-2xl">{subtitle}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {actions}
                    </div>
                </div>
                {children}
            </main>
            <div
                ref={fabRef}
                className="fixed z-40 flex flex-col items-end gap-2"
                style={{
                    bottom: '2rem',
                    right: '2rem',
                    transform: `translate(${fabPosition.x}px, ${fabPosition.y}px)`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
            >
                <button
                    type="button"
                    onClick={() => setMiniChatOpen((prev) => !prev)}
                    onMouseDown={handleMouseDown}
                    className={`group relative inline-flex items-center gap-3 rounded-3xl border border-orange-100 bg-white/95 px-5 py-3 text-sm font-semibold text-gray-800 shadow-[0_25px_60px_rgba(249,115,22,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_35px_70px_rgba(249,115,22,0.3)] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                    <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-200 text-white shadow-lg">
                        <MessageCircle className="h-9 w-9" />
                        <span className="absolute -top-1 -right-1 inline-flex h-8 w-8 animate-ping rounded-full bg-white/70" />
                        <span className="absolute -top-1 -right-1 inline-flex h-8 w-8 rounded-full bg-amber-100" />
                    </span>
                    <span className="flex flex-col text-left">
                        <span className="text-[11px] uppercase tracking-[0.4em] text-orange-400">Copilot</span>
                        <span>{miniChatOpen ? 'Hide Copilot chat' : 'Ask me anything'}</span>
                    </span>
                </button>
                {!miniChatOpen && (
                    <div className="rounded-2xl border border-orange-100 bg-white px-4 py-2 text-xs text-gray-600 shadow-lg">
                        "Need a KPI fast? Ping me anytime."
                    </div>
                )}
                {miniChatOpen && (
                    <div className="fixed right-8 bottom-20 w-72 rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl space-y-3 z-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-orange-400">RGA Copilot</p>
                                <p className="text-sm text-gray-500">Instant guidance across every dashboard tab.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="text-xs text-gray-400 hover:text-gray-600" onClick={clearChatHistory}>
                                    Clear
                                </button>
                                <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setMiniChatOpen(false)}>
                                    Close
                                </button>
                            </div>
                        </div>
                        <div ref={miniChatScrollRef} className="max-h-60 space-y-2 overflow-y-auto pr-1">
                            {miniChatMessages.map((message) => (
                                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${message.sender === 'user'
                                            ? 'bg-gradient-to-r from-orange-500 via-orange-400 to-amber-200 text-white'
                                            : 'bg-orange-50 text-gray-700'
                                            }`}
                                    >
                                        {message.text}
                                    </div>
                                </div>
                            ))}
                            {miniChatTyping && (
                                <div className="text-[11px] text-orange-400">Typing a response...</div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50 px-3">
                            <input
                                type="text"
                                value={miniChatInput}
                                onChange={(event) => setMiniChatInput(event.target.value)}
                                onKeyDown={handleMiniChatKeyDown}
                                placeholder="Ask about any dashboard surface"
                                className="flex-1 bg-transparent py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleMiniChatSend}
                                disabled={!miniChatInput.trim() || miniChatTyping}
                                className="rounded-2xl bg-gray-900 p-2 text-white shadow disabled:opacity-40"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DashboardShell
