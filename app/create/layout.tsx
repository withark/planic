import DocNav from '@/components/doc-creator/DocNav'

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <DocNav />
      <main>{children}</main>
    </div>
  )
}
