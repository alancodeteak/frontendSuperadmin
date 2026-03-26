import { createAsyncThunk } from '@reduxjs/toolkit'
import { listDeliveryPartners } from '@/apis/deliveryPartnersApi'

export const fetchDeliveryPartnersAction = createAsyncThunk(
  'deliveryPartners/list',
  async (params, { getState, rejectWithValue }) => {
    try {
      const accessToken = getState().auth.session.accessToken
      return await listDeliveryPartners(params, { accessToken })
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

