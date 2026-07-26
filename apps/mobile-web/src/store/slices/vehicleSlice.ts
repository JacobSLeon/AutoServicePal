import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Vehicle {
  id: string; // Registration number or internal ID
  registrationNumber: string;
  make: string;
  model: string;
  colour: string;
  motStatus: string;
  motDueDate: string; // From DVLA
  taxStatus: string;
  taxDueDate: string;
  isVerified: boolean; // V5 verified
  isGuest: boolean; // Is it stored locally for guest only?
}

interface VehicleState {
  vehicles: Vehicle[];
}

const initialState: VehicleState = {
  vehicles: [],
};

const vehicleSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    addVehicle: (state, action: PayloadAction<Vehicle>) => {
      // Check if already exists
      const exists = state.vehicles.find(v => v.registrationNumber === action.payload.registrationNumber);
      if (!exists) {
        state.vehicles.push(action.payload);
      }
    },
    removeVehicle: (state, action: PayloadAction<string>) => {
      state.vehicles = state.vehicles.filter(v => v.id !== action.payload);
    },
    setVehicles: (state, action: PayloadAction<Vehicle[]>) => {
      state.vehicles = action.payload;
    },
    reorderVehicles: (state, action: PayloadAction<Vehicle[]>) => {
      state.vehicles = action.payload;
    },
  },
});

export const { addVehicle, removeVehicle, setVehicles, reorderVehicles } = vehicleSlice.actions;
export default vehicleSlice.reducer;
