import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import '../models/models.dart';

class GreenhouseProvider extends ChangeNotifier {
  final Random _random = Random();

  double _tempDrift = 0;
  double _humDrift = 0;
  double _lightDrift = 0;
  double _soilDrift = 0;
  double _phDrift = 0;
  double _ecDrift = 0;

  List<Sensor> _sensors = [];
  final Map<String, List<double>> _sensorHistory = {
    'temperature': [],
    'humidity': [],
    'light': [],
    'soilMoisture': [],
    'ph': [],
    'ec': [],
  };
  List<Device> _devices = [];
  List<Alert> _alerts = [];
  List<AutomationRule> _automationRules = [];
  bool _isOnline = true;

  Timer? _timer;

  List<Sensor> get sensors => _sensors;
  Map<String, List<double>> get sensorHistory => Map.unmodifiable(_sensorHistory);
  List<Device> get devices => _devices;
  List<Alert> get alerts => _alerts;
  List<AutomationRule> get automationRules => _automationRules;
  bool get isOnline => _isOnline;

  int get optimalCount => _sensors.where((s) => s.status == SensorStatus.optimal).length;
  int get activeAlertCount => _alerts.length;
  int get devicesOnCount => _devices.where((d) => d.isOn).length;

  double get healthScore {
    if (_sensors.isEmpty) return 0;
    final score = _sensors.fold<double>(0, (sum, s) {
      switch (s.status) {
        case SensorStatus.optimal:
          return sum + 100;
        case SensorStatus.warning:
          return sum + 50;
        case SensorStatus.critical:
          return sum + 0;
      }
    });
    return score / _sensors.length;
  }

  GreenhouseProvider() {
    _initDevices();
    _initAlertsAndRules();
    for (int i = 0; i < 15; i++) {
      final s = _buildSensors();
      _sensors = s;
      for (final sensor in s) {
        _sensorHistory[sensor.id]!.add(sensor.value);
      }
    }
    _timer = Timer.periodic(const Duration(seconds: 6), (_) => _update());
  }

  double _clamp(double v, double lo, double hi) => v.clamp(lo, hi);
  double _rand(double factor) => (_random.nextDouble() * 2 - 1) * factor;

  List<Sensor> _buildSensors() {
    _tempDrift = _clamp(_tempDrift + _rand(0.4), -3, 3);
    _humDrift = _clamp(_humDrift + _rand(1.5), -8, 8);
    _lightDrift = _clamp(_lightDrift + _rand(150), -600, 600);
    _soilDrift = _clamp(_soilDrift + _rand(0.8), -5, 5);
    _phDrift = _clamp(_phDrift + _rand(0.05), -0.4, 0.4);
    _ecDrift = _clamp(_ecDrift + _rand(0.05), -0.4, 0.4);

    final temp = 29.2 + _tempDrift;
    final hum = 70.0 + _humDrift;
    final light = 5200.0 + _lightDrift;
    final soil = 62.0 + _soilDrift;
    final ph = 6.4 + _phDrift;
    final ec = 2.1 + _ecDrift;

    return [
      Sensor(
        id: 'temperature',
        label: 'Temperature',
        value: temp,
        unit: '°C',
        status: _tempStatus(temp),
        descriptor: temp > 26 ? 'above optimal' : temp < 18 ? 'below optimal' : 'normal',
        optimalMin: 18,
        optimalMax: 26,
      ),
      Sensor(
        id: 'humidity',
        label: 'Air Humidity',
        value: hum,
        unit: '%',
        status: _humStatus(hum),
        descriptor: hum > 75 ? 'high' : hum < 50 ? 'low' : 'normal',
        optimalMin: 50,
        optimalMax: 75,
      ),
      Sensor(
        id: 'light',
        label: 'Light Intensity',
        value: light,
        unit: ' lux',
        status: _lightStatus(light),
        descriptor: light > 8000 ? 'intense' : light < 3000 ? 'low' : 'normal',
        optimalMin: 3000,
        optimalMax: 8000,
      ),
      Sensor(
        id: 'soilMoisture',
        label: 'Soil Moisture',
        value: soil,
        unit: '%',
        status: _soilStatus(soil),
        descriptor: soil > 80 ? 'saturated' : soil < 60 ? 'dry' : 'normal',
        optimalMin: 60,
        optimalMax: 80,
      ),
      Sensor(
        id: 'ph',
        label: 'pH Level',
        value: ph,
        unit: '',
        status: _phStatus(ph),
        descriptor: ph > 7.0 ? 'alkaline' : ph < 6.0 ? 'acidic' : 'neutral',
        optimalMin: 6.0,
        optimalMax: 7.0,
      ),
      Sensor(
        id: 'ec',
        label: 'EC Level',
        value: ec,
        unit: ' mS/cm',
        status: _ecStatus(ec),
        descriptor: ec > 3.5 ? 'high' : ec < 1.5 ? 'low' : 'normal',
        optimalMin: 1.5,
        optimalMax: 3.5,
      ),
    ];
  }

  SensorStatus _tempStatus(double v) {
    if (v < 10 || v > 32) return SensorStatus.critical;
    if (v < 18 || v > 26) return SensorStatus.warning;
    return SensorStatus.optimal;
  }

  SensorStatus _humStatus(double v) {
    if (v < 30 || v > 85) return SensorStatus.critical;
    if (v < 50 || v > 75) return SensorStatus.warning;
    return SensorStatus.optimal;
  }

  SensorStatus _lightStatus(double v) {
    if (v < 1000 || v > 12000) return SensorStatus.critical;
    if (v < 3000 || v > 8000) return SensorStatus.warning;
    return SensorStatus.optimal;
  }

  SensorStatus _soilStatus(double v) {
    if (v < 45 || v > 90) return SensorStatus.critical;
    if (v < 60 || v > 80) return SensorStatus.warning;
    return SensorStatus.optimal;
  }

  SensorStatus _phStatus(double v) {
    if (v < 5.0 || v > 8.0) return SensorStatus.critical;
    if (v < 6.0 || v > 7.0) return SensorStatus.warning;
    return SensorStatus.optimal;
  }

  SensorStatus _ecStatus(double v) {
    if (v < 0.5 || v > 4.5) return SensorStatus.critical;
    if (v < 1.5 || v > 3.5) return SensorStatus.warning;
    return SensorStatus.optimal;
  }

  void _update() {
    final sensors = _buildSensors();
    _sensors = sensors;

    for (final s in sensors) {
      final history = _sensorHistory[s.id]!;
      history.add(s.value);
      if (history.length > 30) history.removeAt(0);
    }

    final criticals = sensors.where((s) => s.status == SensorStatus.critical).toList();
    if (criticals.isNotEmpty) {
      final newAlerts = criticals.map((s) => Alert(
        id: 'auto_${s.id}_${DateTime.now().millisecondsSinceEpoch}',
        message: '${s.label} is at critical level — ${s.descriptor}',
        severity: 'critical',
        timestamp: DateTime.now(),
        sensor: s.id,
      )).toList();
      _alerts = [...newAlerts, ..._alerts].take(50).toList();
    }

    notifyListeners();
  }

  void _initDevices() {
    _devices = const [
      Device(id: 'fan', name: 'Exhaust Fan', isOn: true, type: 'fan'),
      Device(id: 'pump', name: 'Water Pump', isOn: true, type: 'pump'),
      Device(id: 'growLight', name: 'Grow Lights', isOn: false, type: 'light', note: 'Off during daylight'),
      Device(id: 'fogger', name: 'Mist Fogger', isOn: false, type: 'fogger'),
    ];
  }

  void _initAlertsAndRules() {
    _alerts = [
      Alert(
        id: 'init_1',
        message: 'Temperature rising above optimal — fan activated',
        severity: 'warning',
        timestamp: DateTime.now().subtract(const Duration(minutes: 3)),
        sensor: 'temperature',
      ),
      Alert(
        id: 'init_2',
        message: 'System online — all sensors connected',
        severity: 'info',
        timestamp: DateTime.now().subtract(const Duration(minutes: 10)),
      ),
    ];
    _automationRules = const [
      AutomationRule(
        id: 'rule_1',
        condition: 'Temperature > 28°C',
        action: 'Activate exhaust fan at max speed',
        enabled: true,
        device: 'fan',
      ),
      AutomationRule(
        id: 'rule_2',
        condition: 'Humidity > 80%',
        action: 'Turn off fogger + open vents',
        enabled: true,
        device: 'fogger',
      ),
      AutomationRule(
        id: 'rule_3',
        condition: 'Soil moisture < 55%',
        action: 'Activate water pump for 3 minutes',
        enabled: true,
        device: 'pump',
      ),
      AutomationRule(
        id: 'rule_4',
        condition: 'Light < 2000 lux after 6 AM',
        action: 'Turn on grow lights',
        enabled: false,
        device: 'growLight',
      ),
    ];
  }

  void toggleDevice(String deviceId) {
    _devices = _devices.map((d) {
      if (d.id == deviceId) return d.copyWith(isOn: !d.isOn);
      return d;
    }).toList();
    notifyListeners();
  }

  void toggleRule(String ruleId) {
    _automationRules = _automationRules.map((r) {
      if (r.id == ruleId) return r.copyWith(enabled: !r.enabled);
      return r;
    }).toList();
    notifyListeners();
  }

  void dismissAlert(String alertId) {
    _alerts = _alerts.where((a) => a.id != alertId).toList();
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
