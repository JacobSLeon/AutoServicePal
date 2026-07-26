import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

// For local testing on Android emulator use 10.0.2.2, for iOS simulator use localhost
const BASE_URL = 'http://localhost:3001/api/v1';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ 
    baseUrl: BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth?.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Vehicle'],
  endpoints: (builder) => ({
    lookupVehicle: builder.query<any, string>({
      query: (registrationNumber) => `/dvla/lookup/${encodeURIComponent(registrationNumber)}`,
      transformResponse: (response: any) => response.data,
    }),
    uploadV5: builder.mutation<any, { vehicleId: string; formData: FormData }>({
      query: ({ vehicleId, formData }) => ({
        url: `/vehicles/${vehicleId}/v5`,
        method: 'POST',
        body: formData,
      }),
    }),
    login: builder.mutation<any, any>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<any, any>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    syncVehicles: builder.mutation<any, any>({
      query: (vehicles) => ({
        url: '/vehicles/sync',
        method: 'POST',
        body: { vehicles },
      }),
    }),
    getServiceHistory: builder.query<any, string>({
      query: (vehicleId) => `/services/vehicle/${vehicleId}`,
    }),
    addServiceRecord: builder.mutation<any, any>({
      query: (serviceData) => ({
        url: '/services',
        method: 'POST',
        body: serviceData,
      }),
    }),
    uploadServiceProofs: builder.mutation<any, { serviceId: string; formData: FormData }>({
      query: ({ serviceId, formData }) => ({
        url: `/services/${serviceId}/proofs`,
        method: 'POST',
        body: formData,
      }),
    addVehicle: builder.mutation<any, any>({
      query: (vehicleData) => ({
        url: '/vehicles',
        method: 'POST',
        body: vehicleData,
      }),
    }),
    getVehicles: builder.query<any, void>({
      query: () => '/vehicles',
    }),
  }),
});

export const { 
  useLookupVehicleQuery, 
  useLazyLookupVehicleQuery, 
  useUploadV5Mutation,
  useLoginMutation,
  useRegisterMutation,
  useSyncVehiclesMutation,
  useGetServiceHistoryQuery,
  useAddServiceRecordMutation,
  useUploadServiceProofsMutation,
  useAddVehicleMutation,
  useLazyGetVehiclesQuery
} = apiSlice;
