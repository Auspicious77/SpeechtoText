import { Scenario, voiceApi } from '@/services/VoiceApi';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  value?: Scenario;
  onChange?: (s: Scenario) => void;
};

const options: Scenario[] = ['success', 'clarify', 'networkError', 'serverError'];

export const ScenarioToggle: React.FC<Props> = ({ value = 'success', onChange }) => {
  return (
    <View style={styles.row}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => {
            voiceApi.setScenario(opt);
            onChange?.(opt);
          }}
          style={[styles.chip, value === opt && styles.active]}
          accessibilityLabel={`Set scenario ${opt}`}>
          <Text style={[styles.label, value === opt && styles.activeLabel]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' as const },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#eee',
  },
  active: { backgroundColor: '#0A84FF' },
  label: { color: '#111' },
  activeLabel: { color: 'white', fontWeight: '600' },
});
