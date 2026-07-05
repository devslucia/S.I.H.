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
        className="no-print flex items-center gap-2 px-4 py-2 bg-surface-hover
                   text-text rounded-lg hover:bg-accent/10
                   hover:text-accent border border-border text-sm"
      >
        🖨️ Imprimir
      </button>
      <div className="print-only">{children}</div>
    </>
  )
}
