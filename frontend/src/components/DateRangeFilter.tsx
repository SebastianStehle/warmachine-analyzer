import { Button, DateField, DateRangePicker, RangeCalendar } from '@heroui/react';
import { parseDate } from '@internationalized/date';
import { useDateRange } from 'src/lib/date-range';
import { texts } from 'src/texts';

export function DateRangeFilter() {
  const { from, to, setRange } = useDateRange();

  const value = from && to ? { start: parseDate(from), end: parseDate(to) } : null;

  return (
    <div className="flex items-center gap-2">
      <DateRangePicker
        aria-label={texts.common.dateRange}
        value={value}
        onChange={(range) => setRange(range?.start.toString(), range?.end.toString())}
      >
        <DateField.Group>
          <DateField.Input slot="start">{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
          <DateRangePicker.RangeSeparator />
          <DateField.Input slot="end">{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
          <DateField.Suffix>
            <DateRangePicker.Trigger>
              <DateRangePicker.TriggerIndicator />
            </DateRangePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <DateRangePicker.Popover>
          <RangeCalendar aria-label={texts.common.dateRange}>
            <RangeCalendar.Header>
              <RangeCalendar.YearPickerTrigger>
                <RangeCalendar.YearPickerTriggerHeading />
                <RangeCalendar.YearPickerTriggerIndicator />
              </RangeCalendar.YearPickerTrigger>
              <RangeCalendar.NavButton slot="previous" />
              <RangeCalendar.NavButton slot="next" />
            </RangeCalendar.Header>
            <RangeCalendar.Grid>
              <RangeCalendar.GridHeader>
                {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
              </RangeCalendar.GridHeader>
              <RangeCalendar.GridBody>{(date) => <RangeCalendar.Cell date={date} />}</RangeCalendar.GridBody>
            </RangeCalendar.Grid>
            <RangeCalendar.YearPickerGrid>
              <RangeCalendar.YearPickerGridBody>
                {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
              </RangeCalendar.YearPickerGridBody>
            </RangeCalendar.YearPickerGrid>
          </RangeCalendar>
        </DateRangePicker.Popover>
      </DateRangePicker>

      {value && (
        <Button size="sm" variant="ghost" onPress={() => setRange()}>
          {texts.common.clear}
        </Button>
      )}
    </div>
  );
}
