### ioBroker.marstek — Marstek Venus (Modbus TCP) adapter

Integrate your Marstek Venus ESS/inverter into ioBroker via Modbus TCP. This adapter polls telemetry (battery, AC, temperature, energy counters, alarms) and exposes them as ioBroker states. It also supports a set of advanced writeable control registers. Use write functions carefully and at your own risk.

Inspired by `ViperRNMC/marstek_venus_modbus` (`https://github.com/ViperRNMC/marstek_venus_modbus/`).

---

### Features

- **Modbus TCP connection**: Connects to your RS485→TCP gateway (default port 502)
- **Periodic polling**: Configurable interval for reading device registers
- **Rich telemetry**: Battery voltage/current/power/SOC, AC values, temperatures, energy totals, alarms/faults
- **Writeable controls**: Optional settings like force mode, charge/discharge power limits, user work mode, and SOC cutoffs
- **Typed state decoding**: Proper handling of `uint16`, `int16`, `uint32`, `int32`, and `char` strings
- **ioBroker-native states**: States created under `marstek.<instance>.data.*` plus `info.connection`

---

### Requirements

- A Marstek Venus based battery/inverter with Modbus interface enabled
- A Modbus TCP gateway to the device (or built-in TCP if available)
- Network reachability from ioBroker host to the gateway IP:port
- Node.js 18+ and ioBroker JS-Controller 5+ (per `io-package.json`)

---

### Installation

- Install via ioBroker Admin from GitHub (custom adapter) or clone this repository into your ioBroker environment.
- Start/enable the adapter and open its configuration page.

This adapter is not yet published to npm at the time of writing.

---

### Configuration

In ioBroker Admin, set the following fields (see `admin/jsonConfig.json`):

- **Gateway IP address (`host`)**: IP of the Modbus TCP gateway
- **Gateway TCP port (`port`)**: Usually `502`
- **Modbus Unit ID (`unitId`)**: Target device/slave ID (often `1`)
- **Polling interval (`pollIntervalMs`)**: Interval in milliseconds for reading registers (e.g., `5000`)
- **Connect/Request timeout (`connectTimeoutMs`)**: I/O timeout in milliseconds
- **Reconnect interval (`reconnectIntervalMs`)**: Delay before retrying after connection loss

Defaults are provided in `io-package.json` and can be adjusted in Admin.

---

### States and namespace

- **Connection indicator**: `marstek.<instance>.info.connection` (boolean)
- **Data states**: `marstek.<instance>.data.*`

Selected examples (see `src/registers.js` for the full list):

- Battery: `battery_voltage`, `battery_current`, `battery_power`, `battery_soc`, `battery_total_energy`
- AC: `ac_voltage`, `ac_current`, `ac_power`, `ac_frequency`
- Off-grid AC: `ac_offgrid_voltage`, `ac_offgrid_current`, `ac_offgrid_power`
- Energy totals: `total_charging_energy`, `total_discharging_energy`, `total_daily_*`, `total_monthly_*`
- Temperatures: `internal_temp`, `internal_mos1_temp`, `internal_mos2_temp`, `max_cell_temp`, `min_cell_temp`
- Cell voltage extremes: `max_cell_voltage`, `min_cell_voltage`
- Status/diagnostics: `wifi_status`, `cloud_status`, `wifi_signal`, `alarm_status`, `fault_status`, `inverter_state`
- Identity/info: `device_name`, `software_version`, `bms_version`, `firmware_version`, `mac_address`, `sn_code`

Types, roles, scaling and Modbus addresses are defined in `src/registers.js` and mapped into ioBroker states on first start.

---

### Writeable controls (advanced)

The following states are created as writeable and send values to the corresponding Modbus holding registers:

- `backup_function`
- `rs485_control_mode`
- `force_mode` (states: `0 = None`, `1 = Charge`, `2 = Discharge`)
- `charge_to_soc` (%)
- `force_charge_power` (W)
- `force_discharge_power` (W)
- `user_work_mode` (states: `0 = Manual`, `1 = Anti-Feed`, `2 = Trade Mode`)
- `charging_cutoff_capacity` (%)
- `discharging_cutoff_capacity` (%)
- `max_charge_power` (W)
- `max_discharge_power` (W)
- `grid_standard`

Safety notes:
- **Know what you write**: Wrong values can cause device faults or unsafe behavior.
- **Ranges/units**: Respect the device manual for valid ranges and units.
- **Timing**: Some writes may take effect with delay or require specific modes.

---

### How it works (technical overview)

- The adapter connects to the configured host/port and sets the Modbus Unit ID.
- It periodically reads configured registers and decodes values according to their types and scaling.
- For writeable states, setting an unacknowledged value in ioBroker triggers a Modbus write (`writeRegisters`).
- All state definitions (addresses, types, lengths, scaling, units) live in `src/registers.js`.

---

### Troubleshooting

- **No connection**: Verify host, port `502`, firewall rules, and correct `unitId`.
- **Timeouts**: Increase `connectTimeoutMs` and/or check gateway latency/stability.
- **Wrong values/scaling**: Confirm device model/firmware and compare with `src/registers.js` scaling.
- **Write fails**: Ensure the device allows writes for the target register and adapter has connection.
- **Polling load**: Increase `pollIntervalMs` if your network/device is busy.

Enable debug logging in ioBroker to see detailed Modbus read/write traces in the adapter log.

---

### Roadmap / Notes

- Potential future optimization: group contiguous register reads for efficiency
- Expand register coverage based on community feedback and device variants

Contributions and test reports are welcome.

---

### Attribution

This project was inspired by and references the excellent work in `ViperRNMC/marstek_venus_modbus`:
`https://github.com/ViperRNMC/marstek_venus_modbus/`

---

### License

MIT — see `LICENSE`.


