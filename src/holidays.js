
const HOLIDAYS_LS_KEY = 'someday-maybe-holidays-v3';

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

    if (locations == "All") {
      holidays[date] = { name, type };
    }
  }

  return holidays;
}

// We only want one api call to happen at a time so we don't burn through our api requests.
// When we query the holidays for a year, we put the promise for that query in this object
// so that other callers use that api call instead. (It's also worth noting that we don't
// care about race conditions here cause js is single-threaded)
let holidayApiLocks = {};

// function(year: number) -> Map<Date, Holiday>
async function holidayGetYear(year) {
  let holidays = holidaysState[year];

  if (holidays) {
    // The state already exists:
    return holidays;
  } else if (holidayApiLocks[year]) {
    // An api call is already being made:
    return await holidayApiLocks[year];
  } else {
    // Otherwise, make the call:
    let promise = holidayQueryYear(year);
    holidayApiLocks[year] = promise;
    holidays = await promise;

    // And save it where necessary.
    holidaysState[year] = holidays;
    saveHolidays();
    delete holidayApiLocks[year];
    return holidays;
  }
}

// function(year: number, month: number, day: number) -> ?Holiday
async function holidayGet(year, month, day) {
  let holidays = await holidayGetYear(year);
  let dateString = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  let holiday = holidays[dateString];
  if (ACCEPT_TYPE[holiday?.type]) {
    return holiday;
  } else {
    return null;
  }
}

holidayGet(2025, 12, 25).then(holiday => console.log(holiday));
holidayGet(2025, 10, 31).then(holiday => console.log(holiday));
holidayGet(2025, 10, 29).then(holiday => console.log(holiday));
