import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    {
      label: "Today",
      range: {
        from: new Date(new Date().setHours(0, 0, 0, 0)),
        to: new Date(new Date().setHours(23, 59, 59, 999))
      }
    },
    {
      label: "Yesterday",
      range: {
        from: (() => {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        to: (() => {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          d.setHours(23, 59, 59, 999);
          return d;
        })()
      }
    },
    {
      label: "Last 7 days",
      range: {
        from: (() => {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        to: new Date(new Date().setHours(23, 59, 59, 999))
      }
    },
    {
      label: "Last 30 days",
      range: {
        from: (() => {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        to: new Date(new Date().setHours(23, 59, 59, 999))
      }
    },
    {
      label: "This Month",
      range: {
        from: (() => {
          const d = new Date();
          d.setDate(1);
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        to: new Date(new Date().setHours(23, 59, 59, 999))
      }
    },
    {
      label: "Last Month",
      range: {
        from: (() => {
          const d = new Date();
          d.setMonth(d.getMonth() - 1);
          d.setDate(1);
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        to: (() => {
          const d = new Date();
          d.setDate(0); // Last day of previous month
          d.setHours(23, 59, 59, 999);
          return d;
        })()
      }
    }
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          data-testid="button-date-range-picker"
        >
          <CalendarIcon style={{width: '3px', height: '3px'}} className="mr-2" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "LLL dd, y")} -{" "}
                {format(value.to, "LLL dd, y")}
              </>
            ) : (
              format(value.from, "LLL dd, y")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r p-3 space-y-1">
            <div className="text-[8px] font-medium mb-2">Presets</div>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-[8px]"
                onClick={() => {
                  onChange(preset.range);
                  setIsOpen(false);
                }}
                data-testid={`button-preset-${preset.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[8px] text-muted-foreground"
              onClick={() => {
                onChange(undefined);
                setIsOpen(false);
              }}
              data-testid="button-clear-date-range"
            >
              Clear
            </Button>
          </div>
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value?.from}
              selected={value}
              onSelect={onChange}
              numberOfMonths={2}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
