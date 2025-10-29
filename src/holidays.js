
const HOLIDAYS_LS_KEY = 'someday-maybe-holidays-v1';

function loadHolidays() {
  try {
    const raw = localStorage.getItem(HOLIDAYS_LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function defaultHolidays() {
  return {};
}

// type Year = number;
// type Date = string; // like "2025-10-28"
// type Holiday = { name: string }
//
// Map<Year, Map<Date, Holiday>>
let holidaysState = loadHolidays() || defaultHolidays();

function saveHolidays() {
  localStorage.setItem(HOLIDAYS_LS_KEY, JSON.stringify(holidaysState));
}

// don't steal this please :)
const API_KEY = "7AESmE1nWW9Mz5jMjmYdrQsv1rUuoNq1";

const ACCEPT_TYPE = { "Federal Holiday": true, "Observance": true };

// function(year: number) -> Map<Date, Holiday>
async function holidayQueryYear(year) {
  console.log(`querying the holiday api for year ${year}`);

  // NOTE: this is hardcoded D:
  let country = "US";

  let response = await fetch(`https://calendarific.com/api/v2/holidays?&api_key=${API_KEY}&country=${country}&year=${year}`);
  let json = await response.json();

  if (json?.meta?.code != 200) throw new Error("holiday api did not return status of 200");
  if (!json?.response?.holidays) throw new Error("holiday api returned malformed data");

  let holidays = {};

  // holiday: { name: string, date: { iso: string, ... }, primary_type: string, ... }
  for (const holiday of json.response.holidays) {
    let name = holiday?.name;
    let type = holiday?.primary_type;
    let date = holiday?.date?.iso;
    let locations = holiday?.locations;

    if (typeof name != "string" || typeof type != "string" || typeof date != "string") {
      throw new Error(`holiday api returned malformed data: ${JSON.stringify(holiday)}`);
    }

    if (ACCEPT_TYPE[type] && locations == "All") {
      holidays[date] = { name };
    }
  }

  return holidays;
}

// function(year: number) -> Map<Date, Holiday>
async function holidayGetYear(year) {
  let holidays = holidaysState[year];

  if (!holidays) {
    holidays = await holidayQueryYear(year);
    holidaysState[year] = holidays;
    saveHolidays();
  }

  return holidays;
}

// function(year: number, month: number, day: number) -> ?Holiday
async function holidayGet(year, month, day) {
  let holidays = await holidayGetYear(year);
  let dateString = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  return holidays[dateString];
}

holidayGet(2025, 12, 25).then(holiday => console.log(holiday));
holidayGet(2025, 10, 31).then(holiday => console.log(holiday));
holidayGet(2025, 10, 29).then(holiday => console.log(holiday));
