"use client"

interface PrintLayoutProps {
  children: React.ReactNode
  onPrint?: () => void
}

export function PrintLayout({ children, onPrint }: PrintLayoutProps) {
  const handlePrint = () => {
    onPrint?.()
    window.print()
  }

  return (
    <>
      <button
        onClick={handlePrint}
        className="no-print flex items-center gap-2 px-4 py-2 bg-[#1e2535]
                   text-[#f1f5f9] rounded-lg hover:bg-[#00d4a1]/10
                   hover:text-[#00d4a1] border border-[#1e2535] text-sm"
      >
        🖨️ Imprimir
      </button>
      <div className="print-only">{children}</div>
    </>
  )
}
