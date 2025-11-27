// app-mobile/app/LookDetailScreen.tsx
import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useLooks } from "../context/LooksContext";

export default function LookDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    const { looks, deleteLook } = useLooks();
    const lookId: string | undefined = route.params?.id;

    const look = looks.find((l) => l.id === lookId) || null;

    const handleBack = () => {
        navigation.goBack();
    };

    const handleDelete = () => {
        if (!lookId) return;
        deleteLook(lookId);
        navigation.goBack();
    };

    if (!look) {
        return (
            <View style={styles.page}>
                <View style={styles.bgBlobPurple} />
                <View style={styles.bgBlobPink} />
                <View style={styles.centered}>
                    <Text style={styles.mutedText}>This look could not be found.</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleBack}>
                        <Text style={styles.primaryButtonText}>Back to wardrobe</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const createdDate = new Date(look.createdAt);
    const createdLabel = createdDate.toLocaleString();

    const FALLBACK_IMAGE =
        "https://images.unsplash.com/photo-1516646255117-d56e0c644dcd?auto=format&fit=crop&w=900&q=80";

    return (
        <View style={styles.page}>
            {/* background blobs */}
            <View style={styles.bgBlobPurple} />
            <View style={styles.bgBlobPink} />

            {/* Top bar */}
            <View style={styles.topBar}>
                <View style={styles.topLeft}>
                    <TouchableOpacity onPress={handleBack}>
                        <Text style={styles.backText}>← Wardrobe</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Look details</Text>
                </View>
                <View style={styles.topRight}>
                    <Text style={styles.dateText}>{createdLabel}</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.detailInner}>
                {/* Image */}
                <View style={styles.imageCard}>
                    <Image
                        source={{ uri: look.imageUri ?? FALLBACK_IMAGE }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                </View>

                {/* Score + vibe */}
                <View style={styles.section}>
                    <View style={styles.scoreRow}>
                        <View style={styles.scoreCircle}>
                            <Text style={styles.scoreValue}>
                                {look.score != null ? look.score.toFixed(1) : "—"}
                            </Text>
                            <Text style={styles.scoreLabel}>/10</Text>
                        </View>
                        <View style={styles.scoreTextCol}>
                            <Text style={styles.scoreTitle}>{look.vibe ?? "Saved look"}</Text>
                            <Text style={styles.scoreSubtitle}>
                                AI breakdown for this outfit.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Notes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>AI notes</Text>
                    {look.notes && look.notes.length > 0 ? (
                        look.notes.map((note, idx) => (
                            <View key={idx} style={styles.noteRow}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.noteText}>{note}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.mutedText}>
                            No detailed notes were saved for this look.
                        </Text>
                    )}
                </View>

                {/* Tags */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tags</Text>
                    {look.tags && look.tags.length > 0 ? (
                        <View style={styles.tagsRow}>
                            {look.tags.map((tag, idx) => (
                                <View key={idx} style={styles.tagPill}>
                                    <Text style={styles.tagText}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.mutedText}>No tags added.</Text>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.section}>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={handleBack}
                        >
                            <Text style={styles.secondaryButtonText}>Back to wardrobe</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.dangerButton}
                            onPress={handleDelete}
                        >
                            <Text style={styles.dangerButtonText}>Delete this look</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 40 }} />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: "#020617",
    },
    bgBlobPurple: {
        position: "absolute",
        top: -80,
        left: -60,
        width: 260,
        height: 260,
        borderRadius: 999,
        backgroundColor: "rgba(129,140,248,0.35)",
        opacity: 0.7,
    },
    bgBlobPink: {
        position: "absolute",
        bottom: -60,
        right: -40,
        width: 220,
        height: 220,
        borderRadius: 999,
        backgroundColor: "rgba(244,114,182,0.35)",
        opacity: 0.7,
    },
    topBar: {
        height: 56,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: "#0B1120",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    topLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    backText: {
        fontSize: 13,
        color: "#9CA3AF",
        marginRight: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: "600",
        color: "#F9FAFB",
    },
    topRight: {},
    dateText: {
        fontSize: 11,
        color: "#9CA3AF",
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    detailInner: {
        width: "100%",
        maxWidth: 520,      // same as imageCard
        alignSelf: "center" // centers the whole column
      },
    

    /* --- IMAGE AREA (adjusted sizing) --- */
    imageCard: {
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.7)",
        backgroundColor: "rgba(15,23,42,0.96)",
        padding: 14,
        marginBottom: 18,
        alignSelf: "center",
        width: "100%",
        maxWidth: 520, // 🔑 narrower like a centered post
    },
    image: {
        width: "100%",
        aspectRatio: 3 / 4,
        maxHeight: 420, // 🔑 keeps it from going crazy tall
        borderRadius: 16,
        backgroundColor: "#020617",
    },

    section: {
        marginBottom: 18,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#E5E7EB",
        marginBottom: 6,
    },
    scoreRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    scoreCircle: {
        width: 70,
        height: 70,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: "#22C55E",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
    },
    scoreValue: {
        fontSize: 22,
        fontWeight: "800",
        color: "#BBF7D0",
    },
    scoreLabel: {
        fontSize: 11,
        color: "#6EE7B7",
    },
    scoreTextCol: {
        flex: 1,
    },
    scoreTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#F9FAFB",
        marginBottom: 2,
    },
    scoreSubtitle: {
        fontSize: 12,
        color: "#9CA3AF",
    },
    noteRow: {
        flexDirection: "row",
        marginBottom: 4,
    },
    bullet: {
        color: "#9CA3AF",
        marginRight: 4,
        marginTop: 1,
    },
    noteText: {
        fontSize: 12,
        color: "#E5E7EB",
        flex: 1,
    },
    tagsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    tagPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: "rgba(55,65,81,0.9)",
        marginRight: 6,
        marginBottom: 4,
    },
    tagText: {
        fontSize: 11,
        color: "#E5E7EB",
    },
    actionsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
    },
    secondaryButton: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#4B5563",
        paddingVertical: 9,
        paddingHorizontal: 16,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: "rgba(15,23,42,0.9)",
    },
    secondaryButtonText: {
        fontSize: 13,
        color: "#E5E7EB",
    },
    dangerButton: {
        borderRadius: 999,
        paddingVertical: 9,
        paddingHorizontal: 16,
        marginBottom: 8,
        backgroundColor: "rgba(239,68,68,0.15)",
        borderWidth: 1,
        borderColor: "rgba(248,113,113,0.8)",
    },
    dangerButtonText: {
        fontSize: 13,
        color: "#FCA5A5",
        fontWeight: "600",
    },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    mutedText: {
        fontSize: 13,
        color: "#9CA3AF",
        textAlign: "center",
        marginBottom: 12,
    },
    primaryButton: {
        backgroundColor: "#6366F1",
        borderRadius: 999,
        paddingVertical: 9,
        paddingHorizontal: 18,
    },
    primaryButtonText: {
        fontSize: 13,
        color: "#F9FAFB",
        fontWeight: "600",
    },
});
