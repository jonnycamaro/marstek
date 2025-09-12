"use strict";

// Minimal mapping based on provided README table
// fc 3 = holding, 4 = input; Marstek table appears to use holding for most operational values

const makeReg = (id, name, address, type, length, scale, unit, role, stateType, writeable = false, states = undefined) => ({
  id,
  name,
  address,
  type,
  length,
  scale,
  unit,
  role,
  stateType,
  writeable,
  states,
  fc: 3,
});

const registers = [
  makeReg("wifi_status", "WiFi Status", 30300, "uint16", 2, 1, undefined, "value", "number"),
  makeReg("cloud_status", "Cloud Status", 30302, "uint16", 2, 1, undefined, "value", "number"),
  makeReg("wifi_signal", "WiFi Signal Strength", 30303, "uint16", 2, -1, "dbm", "value", "number"),
  makeReg("bms_version", "BMS Version", 30399, "uint16", 2, 1, undefined, "value", "number"),
  makeReg("firmware_version", "Firmware Version", 30401, "uint16", 2, 1, undefined, "value", "number"),
  makeReg("mac_address", "MAC Address", 30402, "char", 12, 1, undefined, "text", "string"),
  makeReg("comm_module_fw", "Communication Module Firmware", 30800, "char", 12, 1, undefined, "text", "string"),
  makeReg("device_name", "Device Name", 31000, "char", 20, 1, undefined, "text", "string"),
  makeReg("software_version", "Software Version", 31100, "uint16", 2, 0.01, undefined, "value", "number"),
  makeReg("sn_code", "SN Code", 31200, "char", 20, 1, undefined, "text", "string"),

  makeReg("battery_voltage", "Battery Voltage", 32100, "uint16", 2, 0.01, "V", "value.voltage", "number"),
  makeReg("battery_current", "Battery Current", 32101, "int16", 2, 0.01, "A", "value.current", "number"),
  makeReg("battery_power", "Battery Power", 32102, "int32", 4, 1, "W", "value.power", "number"),
  makeReg("battery_soc", "Battery SOC", 32104, "uint16", 2, 1, "%", "value.battery", "number"),
  makeReg("battery_total_energy", "Battery Total Energy", 32105, "uint16", 2, 0.001, "kWh", "value", "number"),

  makeReg("ac_voltage", "AC Voltage", 32200, "uint16", 2, 0.1, "V", "value.voltage", "number"),
  makeReg("ac_current", "AC Current", 32201, "int16", 2, 0.01, "A", "value.current", "number"),
  makeReg("ac_power", "AC Power", 32202, "int32", 4, 1, "W", "value.power", "number"),
  makeReg("ac_frequency", "AC Frequency", 32204, "int16", 2, 0.01, "Hz", "value.frequency", "number"),

  makeReg("ac_offgrid_voltage", "AC Offgrid Voltage", 32300, "uint16", 2, 0.1, "V", "value.voltage", "number"),
  makeReg("ac_offgrid_current", "AC Offgrid Current", 32301, "uint16", 2, 0.01, "A", "value.current", "number"),
  makeReg("ac_offgrid_power", "AC Offgrid Power", 32302, "int32", 4, 1, "W", "value.power", "number"),

  makeReg("total_charging_energy", "Total Charging Energy", 33000, "uint32", 4, 0.01, "kWh", "value", "number"),
  makeReg("total_discharging_energy", "Total Discharging Energy", 33002, "int32", 4, 0.01, "kWh", "value", "number"),
  makeReg("total_daily_charging_energy", "Total Daily Charging Energy", 33004, "uint32", 4, 0.01, "kWh", "value", "number"),
  makeReg("total_daily_discharging_energy", "Total Daily Discharging Energy", 33006, "int32", 4, 0.01, "kWh", "value", "number"),
  makeReg("total_monthly_charging_energy", "Total Monthly Charging Energy", 33008, "uint32", 4, 0.01, "kWh", "value", "number"),
  makeReg("total_monthly_discharging_energy", "Total Monthly Discharging Energy", 33010, "int32", 4, 0.01, "kWh", "value", "number"),

  makeReg("internal_temp", "Internal Temperature", 35000, "int16", 2, 0.1, "°C", "value.temperature", "number"),
  makeReg("internal_mos1_temp", "Internal MOS1 Temperature", 35001, "int16", 2, 0.1, "°C", "value.temperature", "number"),
  makeReg("internal_mos2_temp", "Internal MOS2 Temperature", 35002, "int16", 2, 0.1, "°C", "value.temperature", "number"),
  makeReg("max_cell_temp", "Max Cell Temperature", 35010, "int16", 2, 1, "°C", "value.temperature", "number"),
  makeReg("min_cell_temp", "Min Cell Temperature", 35011, "int16", 2, 1, "°C", "value.temperature", "number"),
  makeReg("inverter_state", "Inverter State", 35100, "uint16", 2, 1, undefined, "value", "number"),
  makeReg("max_cell_voltage", "Max Cell Voltage", 37007, "uint16", 2, 0.001, "V", "value.voltage", "number"),
  makeReg("min_cell_voltage", "Min Cell Voltage", 37008, "uint16", 2, 0.001, "V", "value.voltage", "number"),

  makeReg("alarm_status", "Alarm Status", 36000, "uint16", 4, 1, undefined, "value", "number"),
  makeReg("fault_status", "Fault Status", 36100, "uint16", 8, 1, undefined, "value", "number"),
  makeReg("discharge_limit", "Discharge Limit", 41010, "uint16", 2, 1, undefined, "value", "number"),
  makeReg("modbus_address", "Modbus Address", 41100, "uint16", 2, 1, undefined, "value", "number"),

  // Control registers (writeable)
  makeReg("backup_function", "Backup Function", 41200, "uint16", 2, 1, undefined, "switch", "number", true),
  makeReg("rs485_control_mode", "RS485 Control Mode", 42000, "uint16", 2, 1, undefined, "switch", "number", true),
  makeReg("force_mode", "Force Mode", 42010, "uint16", 2, 1, undefined, "value", "number", true, { 0: "None", 1: "Charge", 2: "Discharge" }),
  makeReg("charge_to_soc", "Charge to SOC", 42011, "uint16", 2, 1, "%", "level", "number", true),
  makeReg("force_charge_power", "Set Forcible Charge Power", 42020, "uint16", 2, 1, "W", "value.power", "number", true),
  makeReg("force_discharge_power", "Set Forcible Discharge Power", 42021, "uint16", 2, 1, "W", "value.power", "number", true),
  makeReg("user_work_mode", "User Work Mode", 43000, "uint16", 2, 1, undefined, "value", "number", true, { 0: "Manual", 1: "Anti-Feed", 2: "Trade Mode" }),
  makeReg("charging_cutoff_capacity", "Charging Cutoff Capacity", 44000, "uint16", 2, 0.1, "%", "level", "number", true),
  makeReg("discharging_cutoff_capacity", "Discharging Cutoff Capacity", 44001, "uint16", 2, 0.1, "%", "level", "number", true),
  makeReg("max_charge_power", "Max Charge Power", 44002, "uint16", 2, 1, "W", "value.power", "number", true),
  makeReg("max_discharge_power", "Max Discharge Power", 44003, "uint16", 2, 1, "W", "value.power", "number", true),
  makeReg("grid_standard", "Grid Standard", 44100, "uint16", 2, 1, undefined, "value", "number", true)
];

module.exports = { registers };


