import { Sun, Moon, Monitor, Palette, Check } from 'lucide-react';
import { useThemeStore, type ThemeMode, type PrimaryColor, colorPalette } from '@/store/theme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export function ThemePicker() {
  const { mode, primaryColor, setMode, setPrimaryColor } = useThemeStore();

  const handleModeSelect = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const handleColorSelect = (color: PrimaryColor) => {
    setPrimaryColor(color);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="border-primary data-[state=open]:border-transparent" title="Theme settings">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Theme settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {/* Theme Mode Section */}
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Theme Mode
        </DropdownMenuLabel>
        <div className="px-2 pb-2">
          <div className="flex gap-2">
            <Button
              variant={mode === 'light' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => handleModeSelect('light')}
            >
              <Sun className="mr-2 h-4 w-4" />
              Light
            </Button>
            <Button
              variant={mode === 'dark' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => handleModeSelect('dark')}
            >
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </Button>
            <Button
              variant={mode === 'system' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => handleModeSelect('system')}
            >
              <Monitor className="mr-2 h-4 w-4" />
              System
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Primary Color Section */}
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Primary Color
        </DropdownMenuLabel>
        <div className="px-2 pb-2">
          <div className="grid grid-cols-7 gap-2">
            {(Object.keys(colorPalette) as PrimaryColor[]).map((color) => {
              const isSelected = primaryColor === color;
              const colorValue = colorPalette[color][mode === 'light' ? 'light' : 'dark'];

              return (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className="relative h-9 w-9 rounded-md border-2 transition-all hover:scale-110 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1"
                  style={{
                    backgroundColor: `hsl(${colorValue})`,
                    borderColor: isSelected ? 'hsl(var(--foreground))' : 'transparent',
                  }}
                  title={colorPalette[color].label}
                  aria-label={`Select ${colorPalette[color].label} theme`}
                >
                  {isSelected ? (
                    <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-lg" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
