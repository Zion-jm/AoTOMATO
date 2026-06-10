enum SensorStatus { optimal, warning, critical }

class Sensor {
  final String id;
  final String label;
  final double value;
  final String unit;
  final SensorStatus status;
  final String descriptor;
  final double optimalMin;
  final double optimalMax;

  const Sensor({
    required this.id,
    required this.label,
    required this.value,
    required this.unit,
    required this.status,
    required this.descriptor,
    required this.optimalMin,
    required this.optimalMax,
  });

  String get statusLabel {
    switch (status) {
      case SensorStatus.optimal:
        return 'OPTIMAL';
      case SensorStatus.warning:
        return 'WARNING';
      case SensorStatus.critical:
        return 'CRITICAL';
    }
  }
}

class Device {
  final String id;
  final String name;
  final bool isOn;
  final String type;
  final String? note;

  const Device({
    required this.id,
    required this.name,
    required this.isOn,
    required this.type,
    this.note,
  });

  Device copyWith({bool? isOn}) {
    return Device(
      id: id,
      name: name,
      isOn: isOn ?? this.isOn,
      type: type,
      note: note,
    );
  }
}

class Alert {
  final String id;
  final String message;
  final String severity;
  final DateTime timestamp;
  final String? sensor;

  const Alert({
    required this.id,
    required this.message,
    required this.severity,
    required this.timestamp,
    this.sensor,
  });
}

class AutomationRule {
  final String id;
  final String condition;
  final String action;
  final bool enabled;
  final String? device;

  const AutomationRule({
    required this.id,
    required this.condition,
    required this.action,
    required this.enabled,
    this.device,
  });

  AutomationRule copyWith({bool? enabled}) {
    return AutomationRule(
      id: id,
      condition: condition,
      action: action,
      enabled: enabled ?? this.enabled,
      device: device,
    );
  }
}

class RiskResult {
  final double current;
  final double? current2;
  final double predicted;
  final double? predicted2;
  final double slope;
  final double? minsToBreach;
  final double confidence;
  final String level;
  final String trendLabel;

  const RiskResult({
    required this.current,
    this.current2,
    required this.predicted,
    this.predicted2,
    required this.slope,
    this.minsToBreach,
    required this.confidence,
    required this.level,
    required this.trendLabel,
  });
}
