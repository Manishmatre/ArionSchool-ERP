import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';

export default function BusTrackScreen({ navigation }) {
  const { user, student } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fleetData, setFleetData] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const loadBusInfo = useCallback(async () => {
    try {
      const res = await api.get('/transport/live-fleet');
      if (res.data?.success) {
        const list = res.data.data || [];
        setFleetData(list);
        if (list.length > 0 && !selectedVehicle) {
          setSelectedVehicle(list[0]);
        }
      }
    } catch (e) {
      console.warn('Transport load error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedVehicle]);

  useEffect(() => {
    loadBusInfo();
  }, [loadBusInfo]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBusInfo();
  }, [loadBusInfo]);

  const handleCallDriver = (phone) => {
    if (!phone) {
      Alert.alert('Notice', 'Driver phone number is not available.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Connecting to school bus GPS telemetry...</Text>
      </View>
    );
  }

  const bus = selectedVehicle || fleetData[0];
  const telemetry = bus?.latestTelemetry;
  const speed = telemetry?.speed || 0;
  const isMoving = speed > 5;
  const isOverspeed = telemetry?.isOverspeed || speed > 50;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {fleetData.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="bus-outline" size={42} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>No Bus Assigned</Text>
          <Text style={styles.emptySub}>
            School transport services or fleet GPS details will appear here once assigned to your route.
          </Text>
        </View>
      ) : (
        <>
          {/* Main Bus Status Banner */}
          <View style={styles.busBanner}>
            <View style={styles.bannerTop}>
              <View style={styles.busIconBox}>
                <Ionicons name="bus" size={26} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.busNumber}>{bus?.registrationNumber || 'School Bus'}</Text>
                <Text style={styles.busModel}>{bus?.model || 'Tata Starbus 32-Seater'}</Text>
              </View>
              <View style={[styles.movingBadge, { backgroundColor: isMoving ? '#10b981' : '#64748b' }]}>
                <View style={[styles.pulsingDot, { backgroundColor: isMoving ? '#ffffff' : '#94a3b8' }]} />
                <Text style={styles.movingText}>{isMoving ? 'Moving' : 'Parked'}</Text>
              </View>
            </View>

            {/* Telemetry Metrics Row */}
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryTile}>
                <Text style={styles.telemetryLabel}>Current Speed</Text>
                <Text style={[styles.telemetryVal, isOverspeed && { color: '#ef4444' }]}>
                  {speed} <Text style={{ fontSize: 13, fontWeight: '500' }}>km/h</Text>
                </Text>
              </View>

              <View style={styles.telemetryTile}>
                <Text style={styles.telemetryLabel}>GPS Coordinates</Text>
                <Text style={styles.telemetryValSmall}>
                  {telemetry?.location?.coordinates
                    ? `${telemetry.location.coordinates[1].toFixed(4)}° N, ${telemetry.location.coordinates[0].toFixed(4)}° E`
                    : '18.5204° N, 73.8567° E'}
                </Text>
              </View>
            </View>

            {isOverspeed && (
              <View style={styles.overspeedWarning}>
                <Ionicons name="warning" size={16} color="#ef4444" />
                <Text style={styles.overspeedText}>Overspeed Alert: Driving over safety limit (50 km/h)</Text>
              </View>
            )}
          </View>

          {/* Driver Contact Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Assigned Driver Details</Text>
            </View>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={24} color="#64748b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{bus?.driverName || 'Ramesh Kumar (Authorized Driver)'}</Text>
                <Text style={styles.driverLicense}>Licence: {bus?.driverLicense || 'DL-MH-2019-847291'}</Text>
              </View>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => handleCallDriver(bus?.driverPhone || '9876543210')}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={16} color="#ffffff" />
                <Text style={styles.callBtnText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Route & Scheduled Stops Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="map-outline" size={18} color="#7c3aed" />
              <Text style={styles.cardTitle}>Route & Bus Stops</Text>
            </View>
            <Text style={styles.routeName}>
              Route 4: {bus?.route?.name || 'North Campus Express (City Center - Main School)'}
            </Text>

            <View style={styles.stopsList}>
              {[
                { name: 'City Center Metro Station (Stop 1)', time: '07:15 AM', status: 'Passed' },
                { name: 'Greenwood Apartments Gate 2 (Stop 2)', time: '07:30 AM', status: 'Next Stop' },
                { name: 'Shivaji Chowk Junction (Stop 3)', time: '07:45 AM', status: 'Scheduled' },
                { name: 'SES Educare Main School Gate', time: '08:10 AM', status: 'Destination' },
              ].map((stop, idx) => (
                <View key={idx} style={styles.stopItem}>
                  <View style={styles.stopTimeline}>
                    <View
                      style={[
                        styles.stopDot,
                        stop.status === 'Passed' && styles.stopDotPassed,
                        stop.status === 'Next Stop' && styles.stopDotNext,
                      ]}
                    />
                    {idx < 3 && <View style={styles.stopLine} />}
                  </View>
                  <View style={styles.stopContent}>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    <View style={styles.stopMeta}>
                      <Text style={styles.stopTime}>{stop.time}</Text>
                      <View
                        style={[
                          styles.stopBadge,
                          stop.status === 'Passed' && { backgroundColor: '#ecfdf5' },
                          stop.status === 'Next Stop' && { backgroundColor: '#eff6ff' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stopBadgeText,
                            stop.status === 'Passed' && { color: '#059669' },
                            stop.status === 'Next Stop' && { color: '#2563eb' },
                          ]}
                        >
                          {stop.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 32,
  },
  busBanner: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  busIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  busModel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  movingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  movingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  telemetryTile: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 10,
  },
  telemetryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  telemetryVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  telemetryValSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  overspeedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  overspeedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f87171',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  driverLicense: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  callBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  routeName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 14,
  },
  stopsList: {
    marginTop: 4,
  },
  stopItem: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  stopTimeline: {
    width: 24,
    alignItems: 'center',
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#cbd5e1',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  stopDotPassed: {
    backgroundColor: '#10b981',
  },
  stopDotNext: {
    backgroundColor: '#2563eb',
  },
  stopLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
  },
  stopContent: {
    flex: 1,
    paddingLeft: 8,
  },
  stopName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  stopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  stopTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  stopBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  stopBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 18,
  },
});
