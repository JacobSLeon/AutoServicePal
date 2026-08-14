import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

import Constants from 'expo-constants';
import type { Vehicle } from '../../types/vehicle';

// For local testing on Android emulator use 10.0.2.2, for iOS simulator use localhost
const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3001/api/v1';

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
      invalidatesTags: ['Vehicle'],
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
    forgotPassword: builder.mutation<any, any>({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),
    syncVehicles: builder.mutation<{ status: string; data: { vehicles: any[] } }, any>({
      query: (vehicles) => ({
        url: '/vehicles/sync',
        method: 'POST',
        body: { vehicles },
      }),
    }),
    deleteAccount: builder.mutation<any, void>({
      query: () => ({
        url: '/users/me',
        method: 'DELETE',
      }),
    }),
    getServiceHistory: builder.query<any, string>({
      query: (vehicleId) => `/services/vehicle/${vehicleId}`,
      providesTags: ['Vehicle'],
    }),
    addServiceRecord: builder.mutation<any, any>({
      query: (serviceData) => ({
        url: '/services',
        method: 'POST',
        body: serviceData,
      }),
      invalidatesTags: ['Vehicle'],
    }),
    updateServiceRecord: builder.mutation<any, { id: string; serviceData: any }>({
      query: ({ id, serviceData }) => ({
        url: `/services/${id}`,
        method: 'PUT',
        body: serviceData,
      }),
      invalidatesTags: ['Vehicle'],
    }),
    uploadServiceProofs: builder.mutation<any, { serviceId: string; formData: FormData }>({
      query: ({ serviceId, formData }) => ({
        url: `/services/${serviceId}/proofs`,
        method: 'POST',
        body: formData,
      }),
    }),
    addVehicle: builder.mutation<{ status: string; data: { vehicle: any } }, any>({
      query: (vehicleData) => ({
        url: '/vehicles',
        method: 'POST',
        body: vehicleData,
      }),
    }),
    getVehicles: builder.query<{ status: string; data: { vehicles: any[] } }, void>({
      query: () => '/vehicles',
      providesTags: ['Vehicle'],
    }),
    deleteVehicle: builder.mutation<any, string>({
      query: (id) => ({
        url: `/vehicles/${id}`,
        method: 'DELETE',
      }),
    }),
    getPendingReviews: builder.query<any, void>({
      query: () => '/admin/pending',
    }),
    reviewV5: builder.mutation<any, { id: string; status: string; rejection_reason?: string }>({
      query: ({ id, ...body }) => ({
        url: `/admin/v5-review/${id}`,
        method: 'POST',
        body,
      }),
    }),
    verifyWorkItem: builder.mutation<any, { id: string; status: string; admin_note?: string }>({
      query: ({ id, ...body }) => ({
        url: `/admin/work-item/${id}/verify`,
        method: 'POST',
        body,
      }),
    }),
    getDailyReport: builder.query<any, void>({
      query: () => '/reports/daily',
    }),
    getWeeklyReport: builder.query<any, void>({
      query: () => '/reports/weekly',
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
  useUpdateServiceRecordMutation,
  useUploadServiceProofsMutation,
  useAddVehicleMutation,
  useDeleteVehicleMutation,
  useLazyGetVehiclesQuery,
  useGetPendingReviewsQuery,
  useReviewV5Mutation,
  useVerifyWorkItemMutation,
  useForgotPasswordMutation,
  useGetDailyReportQuery,
  useGetWeeklyReportQuery,
  useDeleteAccountMutation
} = apiSlice;
