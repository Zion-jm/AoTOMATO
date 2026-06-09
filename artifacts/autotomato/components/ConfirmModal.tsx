import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DeviceMode } from "@/contexts/GreenhouseContext";
import { useColors } from "@/hooks/useColors";

interface ConfirmModalProps {
  visible: boolean;
  deviceName: string;
  targetMode: DeviceMode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  deviceName,
  targetMode,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const colors = useColors();

  const actionLabel =
    targetMode === "FORCE_ON"
      ? "FORCE ON"
      : targetMode === "FORCE_OFF"
      ? "FORCE OFF"
      : "AUTO";

  const actionColor =
    targetMode === "FORCE_ON"
      ? colors.forceOn
      : targetMode === "FORCE_OFF"
      ? colors.forceOff
      : colors.autoColor;

  const warningText =
    targetMode === "FORCE_ON"
      ? "This will activate the device regardless of automation rules."
      : targetMode === "FORCE_OFF"
      ? "This will disable the device regardless of automation rules."
      : "Device will return to automatic control.";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[
            styles.modal,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => {}}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
            <MaterialCommunityIcons
              name="shield-alert-outline"
              size={32}
              color={actionColor}
            />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            Manual Override
          </Text>

          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Set{" "}
            <Text style={[styles.deviceName, { color: colors.foreground }]}>
              {deviceName}
            </Text>{" "}
            to{" "}
            <Text style={[styles.actionLabel, { color: actionColor }]}>
              {actionLabel}
            </Text>
            ?
          </Text>

          <View
            style={[styles.warningBox, { backgroundColor: colors.secondary, borderColor: actionColor }]}
          >
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={colors.mutedForeground}
            />
            <Text style={[styles.warningText, { color: colors.mutedForeground }]}>
              {warningText}
            </Text>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: actionColor }]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  deviceName: {
    fontFamily: "Inter_600SemiBold",
  },
  actionLabel: {
    fontFamily: "Inter_700Bold",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
    width: "100%",
  },
  warningText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 17,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    width: "100%",
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  buttonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
