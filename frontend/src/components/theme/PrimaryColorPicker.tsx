import { Palette, Check } from 'lucide-react';
import { useThemeStore, colorPalette, type PrimaryColor } from '@/store/theme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

export function PrimaryColorPicker() {
  const { primaryColor, setPrimaryColor } = useThemeStore();

  // Group colors by category
  const colorGroups = {
    'Neutral': ['slate', 'gray', 'zinc', 'neutral', 'stone'] as PrimaryColor[],
    'Colors': ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'] as PrimaryColor[],
  };

  const handleColorSelect = (color: PrimaryColor) => {
    setPrimaryColor(color);
  };

  // Get preview color for button (use current theme)
  const getPreviewColor = (color: PrimaryColor) => {
    const hsl = colorPalette[color].light;
    return `hsl(${hsl})`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="border-primary" title="Change primary color">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Change primary color</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Primary Color</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          <div className="p-2 space-y-4">
            {Object.entries(colorGroups).map(([groupName, colors]) => (
              <div key={groupName}>
                <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                  {groupName}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      className="relative group flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors"
                      title={colorPalette[color].label}
                    >
                      <div
                        className="w-8 h-8 rounded-full border-2 border-border shadow-sm transition-transform group-hover:scale-110"
                        style={{ backgroundColor: getPreviewColor(color) }}
                      >
                        {primaryColor === color && (
                          <div className="w-full h-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-white drop-shadow-md" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                        {colorPalette[color].label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
