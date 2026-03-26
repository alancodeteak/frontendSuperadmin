import { createAsyncThunk } from '@reduxjs/toolkit'
import {
  blockDeliveryPartner,
  deleteDeliveryPartner,
  getDeliveryPartnerDetail,
  listDeliveryPartners,
  restoreDeliveryPartner,
} from '@/apis/deliveryPartnersApi'

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

export const fetchDeliveryPartnerDetailAction = createAsyncThunk(
  'deliveryPartners/detail',
  async (params, { getState, rejectWithValue }) => {
    try {
      const accessToken = getState().auth.session.accessToken
      return await getDeliveryPartnerDetail(params, { accessToken })
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

export const blockDeliveryPartnerAction = createAsyncThunk(
  'deliveryPartners/block',
  async (params, { getState, rejectWithValue }) => {
    try {
      const accessToken = getState().auth.session.accessToken
      return await blockDeliveryPartner(params, { accessToken })
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

export const deleteDeliveryPartnerAction = createAsyncThunk(
  'deliveryPartners/delete',
  async (params, { getState, rejectWithValue }) => {
    try {
      const accessToken = getState().auth.session.accessToken
      return await deleteDeliveryPartner(params, { accessToken })
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

export const restoreDeliveryPartnerAction = createAsyncThunk(
  'deliveryPartners/restore',
  async (params, { getState, rejectWithValue }) => {
    try {
      const accessToken = getState().auth.session.accessToken
      return await restoreDeliveryPartner(params, { accessToken })
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

