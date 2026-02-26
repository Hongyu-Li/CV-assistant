import { Toaster } from './components/ui/sonner'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Textarea } from './components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './components/ui/select'
import { toast } from 'sonner'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/40 p-4 flex flex-col gap-4">
        <div className="font-semibold text-lg">CV Assistant</div>
        <nav className="flex flex-col gap-2">
          <Button variant="ghost" className="justify-start">
            Dashboard
          </Button>
          <Button variant="ghost" className="justify-start">
            Resumes
          </Button>
          <Button variant="ghost" className="justify-start">
            Settings
          </Button>
        </nav>
        <div className="mt-auto">
          <Button onClick={ipcHandle} className="w-full">
            Send IPC Ping
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New CV</CardTitle>
                <CardDescription>Start building your resume here.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Title</label>
                  <Input placeholder="e.g. Software Engineer" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Experience Level</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="mid">Mid-Level</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => toast('CV Draft Created!')}>Create Draft</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Notes</CardTitle>
                <CardDescription>Jot down ideas for your next application.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea placeholder="Type your notes here..." className="min-h-[120px]" />
                <Button variant="secondary" onClick={() => toast('Notes saved!')}>
                  Save Notes
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  )
}

export default App
