import { Alert as RNAlert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export const crossPlatformAlert = (title: string, message: string, buttons?: AlertButton[]) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      // Find the primary action button and cancel button
      const cancelButton = buttons.find(b => b.style === 'cancel') || buttons[0];
      const actionButton = buttons.find(b => b.style !== 'cancel') || buttons[buttons.length - 1];

      // If it's just an OK button with an action
      if (buttons.length === 1) {
        window.alert(`${title}\n\n${message}`);
        if (buttons[0].onPress) {
          buttons[0].onPress();
        }
        return;
      }

      // If there are multiple buttons, use confirm
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed && actionButton.onPress) {
        actionButton.onPress();
      } else if (!confirmed && cancelButton.onPress) {
        cancelButton.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    RNAlert.alert(title, message, buttons);
  }
};
