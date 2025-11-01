import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectTime: (date: Date) => void;
};

export const TimePickerOverlay: React.FC<Props> = ({
  visible,
  onClose,
  onSelectTime,
}) => {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      setDate(selectedDate);
      if (Platform.OS === 'android') {
        onSelectTime(selectedDate);
      }
    } else if (Platform.OS === 'android') {
      onClose();
    }
  };

  const handleDone = () => {
    onSelectTime(date);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Time</Text>
            {Platform.OS === 'ios' && (
              <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {(Platform.OS === 'ios' || showPicker) && (
            <DateTimePicker
              value={date}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
              onChange={handleChange}
              style={styles.picker}
            />
          )}
          
          {Platform.OS === 'android' && !showPicker && (
            <TouchableOpacity
              style={styles.androidButton}
              onPress={() => setShowPicker(true)}
            >
              <Text style={styles.androidButtonText}>Choose Time</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  doneButton: {
    padding: 8,
  },
  doneButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  picker: {
    height: 200,
  },
  androidButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  androidButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});