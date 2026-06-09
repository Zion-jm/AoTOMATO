import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const PHOTOS_KEY = "@autotomato/photos";

interface PhotoEntry {
  id: string;
  uri: string;
  timestamp: string;
}

function LiveBadge() {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={[styles.liveBadge, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
      <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

export default function CameraScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [signalStrength] = useState(3);
  const cameraRef = useRef<CameraView>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PHOTOS_KEY);
        if (stored) setPhotos(JSON.parse(stored));
      } catch {}
    })();
  }, []);

  const savePhoto = async (uri: string) => {
    const newEntry: PhotoEntry = {
      id: `${Date.now()}`,
      uri,
      timestamp: new Date().toISOString(),
    };
    const next = [newEntry, ...photos];
    setPhotos(next);
    try {
      await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(next.slice(0, 50)));
    } catch {}
  };

  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (Platform.OS !== "web" && cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: false,
        });
        if (photo?.uri) await savePhoto(photo.uri);
      } else {
        await savePhoto(`https://placehold.co/400x300/162018/4ADE80?text=Snapshot+${Date.now()}`);
      }
    } catch {
    } finally {
      setTimeout(() => setIsCapturing(false), 1000);
    }
  };

  const groupByDate = (items: PhotoEntry[]) => {
    const groups: Record<string, PhotoEntry[]> = {};
    for (const item of items) {
      const date = new Date(item.timestamp).toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    }
    return Object.entries(groups);
  };

  const groups = groupByDate(photos);

  const renderCamera = () => {
    if (Platform.OS === "web") {
      return (
        <View style={[styles.cameraPlaceholder, { backgroundColor: colors.secondary }]}>
          <MaterialCommunityIcons name="cctv" size={48} color={colors.mutedForeground} />
          <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>
            Camera not available on web
          </Text>
        </View>
      );
    }

    if (!permission) {
      return (
        <View style={[styles.cameraPlaceholder, { backgroundColor: colors.secondary }]}>
          <MaterialCommunityIcons name="camera-outline" size={48} color={colors.mutedForeground} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={[styles.cameraPlaceholder, { backgroundColor: colors.secondary }]}>
          <MaterialCommunityIcons name="camera-lock-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.permissionText, { color: colors.mutedForeground }]}>
            Camera access required
          </Text>
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
            activeOpacity={0.7}
          >
            <Text style={[styles.permissionBtnText, { color: colors.background }]}>
              Enable Camera
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.cameraOverlay}>
          <LiveBadge />
          <View style={styles.signalIndicator}>
            {[1, 2, 3, 4].map((bar) => (
              <View
                key={bar}
                style={[
                  styles.signalBar,
                  { height: 6 + bar * 4 },
                  {
                    backgroundColor:
                      bar <= signalStrength ? colors.optimal : colors.secondary,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </CameraView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={groups}
        keyExtractor={([date]) => date}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 90 },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>Camera Feed</Text>

            <View style={[styles.cameraCard, { borderColor: colors.border }]}>
              {renderCamera()}
              <View style={[styles.cameraFooter, { backgroundColor: colors.card }]}>
                <View>
                  <Text style={[styles.cameraLabel, { color: colors.foreground }]}>
                    Greenhouse — Zone A
                  </Text>
                  <Text style={[styles.cameraSubLabel, { color: colors.mutedForeground }]}>
                    Wide-angle lens · Continuous stream
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.captureBtn,
                    {
                      backgroundColor: isCapturing ? colors.secondary : colors.primary,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleCapture}
                  activeOpacity={0.75}
                  disabled={isCapturing}
                >
                  <MaterialCommunityIcons
                    name={isCapturing ? "timer-sand" : "camera"}
                    size={20}
                    color={isCapturing ? colors.mutedForeground : colors.background}
                  />
                  <Text
                    style={[
                      styles.captureBtnText,
                      {
                        color: isCapturing ? colors.mutedForeground : colors.background,
                      },
                    ]}
                  >
                    {isCapturing ? "Saving..." : "Snapshot"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {photos.length > 0 && (
              <Text style={[styles.galleryTitle, { color: colors.mutedForeground }]}>
                PHOTO GALLERY
              </Text>
            )}
          </View>
        }
        renderItem={({ item: [date, dayPhotos] }) => (
          <View style={styles.dateGroup}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>{date}</Text>
            <View style={styles.photoGrid}>
              {dayPhotos.map((photo) => (
                <Pressable
                  key={photo.id}
                  style={[styles.photoThumb, { borderColor: colors.border }]}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                  <View style={[styles.photoTime, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
                    <Text style={styles.photoTimeText}>
                      {new Date(photo.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="camera-off-outline"
              size={40}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No snapshots yet
            </Text>
            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
              Tap the Snapshot button to capture
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
  },
  header: {
    gap: 0,
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  cameraCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  camera: {
    width: "100%",
    aspectRatio: 16 / 10,
  },
  cameraPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  permissionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  permissionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  permissionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  cameraOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 12,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#F87171",
  },
  liveText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  signalIndicator: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },
  cameraFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  cameraLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  cameraSubLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  captureBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  galleryTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoThumb: {
    width: "30.5%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoTime: {
    position: "absolute",
    bottom: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoTimeText: {
    color: "#FFF",
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  emptySubText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
