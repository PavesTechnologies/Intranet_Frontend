import { Search, Bell, Settings, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-card">
      <div className="flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
              <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-card-foreground leading-none tracking-tight">RMS</h1>
              <p className="text-[10px] font-medium text-muted-foreground leading-none mt-1">Workforce Availability</p>
            </div>
          </div>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-8 font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8 font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              Demand
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8 font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              Projects
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8 font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              Reports
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden lg:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              className="h-8 w-64 pl-8 text-xs bg-muted/50 border-input focus:bg-background transition-colors"
            />
          </div>
          <div className="flex items-center gap-1">
            <button className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Bell className="h-4 w-4" />
            </button>
            <button className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Settings className="h-4 w-4" />
            </button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <Avatar className="h-8 w-8 border cursor-pointer ring-names ring-1 ring-transparent hover:ring-border transition-all">
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              DM
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
