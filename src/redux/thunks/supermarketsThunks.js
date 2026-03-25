import { createAsyncThunk } from '@reduxjs/toolkit'
import {
  createSupermarket,
  deleteSupermarket,
  getSupermarket,
  listSupermarkets,
  updateSupermarket,
} from '@/apis/supermarketsApi'

export const fetchSupermarketsAction = createAsyncThunk(
  'supermarkets/list',
  async (params, { getState, rejectWithValue }) => {
    try {
      const accessToken = getState().auth.session.accessToken
      return await listSupermarkets(params, { accessToken })
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

export const fetchSupermarketDetailAction = createAsyncThunk(
  'supermarkets/detail',
  async ({ user_id: userId }, { getState, rejectWithValue }) => {
    try {
      const accessToken = getState().auth.session.accessToken
      const data = await getSupermarket({ user_id: userId }, { accessToken })
      return { userId, data }
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

export const createSupermarketAction = createAsyncThunk(
  'supermarkets/create',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const accessToken = getState().auth.session.accessToken
      const data = await createSupermarket(payload, { accessToken })
      return data
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

export const updateSupermarketAction = createAsyncThunk(
  'supermarkets/update',
  async ({ user_id: userId, patch }, { getState, rejectWithValue }) => {
    try {
      const accessToken = getState().auth.session.accessToken
      const data = await updateSupermarket({ user_id: userId, patch }, { accessToken })
      return { userId, data }
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

export const deleteSupermarketAction = createAsyncThunk(
  'supermarkets/delete',
  async ({ user_id: userId }, { getState, rejectWithValue }) => {
    try {
      const accessToken = getState().auth.session.accessToken
      const data = await deleteSupermarket({ user_id: userId }, { accessToken })
      return { userId, data }
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

