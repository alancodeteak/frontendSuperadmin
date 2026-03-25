import { createSlice } from '@reduxjs/toolkit'
import {
  createSupermarketAction,
  deleteSupermarketAction,
  fetchSupermarketDetailAction,
  fetchSupermarketsAction,
  updateSupermarketAction,
} from '@/redux/thunks/supermarketsThunks'

const initialState = {
  list: {
    items: [],
    meta: null,
    status: 'idle',
    error: null,
  },
  detail: {
    entity: null,
    status: 'idle',
    error: null,
  },
  create: {
    status: 'idle',
    error: null,
  },
  update: {
    status: 'idle',
    error: null,
  },
  delete: {
    status: 'idle',
    error: null,
  },
}

const supermarketsSlice = createSlice({
  name: 'supermarkets',
  initialState,
  reducers: {
    clearSupermarketsErrors(state) {
      state.list.error = null
      state.detail.error = null
      state.create.error = null
      state.update.error = null
      state.delete.error = null
    },
    clearSupermarketDetail(state) {
      state.detail.entity = null
      state.detail.status = 'idle'
      state.detail.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSupermarketsAction.pending, (state) => {
        state.list.status = 'loading'
        state.list.error = null
      })
      .addCase(fetchSupermarketsAction.fulfilled, (state, action) => {
        state.list.status = 'succeeded'
        state.list.items = action.payload?.items ?? []
        state.list.meta = action.payload?.meta ?? null
      })
      .addCase(fetchSupermarketsAction.rejected, (state, action) => {
        state.list.status = 'failed'
        state.list.error =
          action.payload ?? { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to load supermarkets' }
      })
      .addCase(fetchSupermarketDetailAction.pending, (state) => {
        state.detail.status = 'loading'
        state.detail.error = null
      })
      .addCase(fetchSupermarketDetailAction.fulfilled, (state, action) => {
        state.detail.status = 'succeeded'
        state.detail.entity = action.payload?.data ?? null
      })
      .addCase(fetchSupermarketDetailAction.rejected, (state, action) => {
        state.detail.status = 'failed'
        state.detail.error =
          action.payload ?? { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to load supermarket' }
      })
      .addCase(createSupermarketAction.pending, (state) => {
        state.create.status = 'loading'
        state.create.error = null
      })
      .addCase(createSupermarketAction.fulfilled, (state) => {
        state.create.status = 'succeeded'
      })
      .addCase(createSupermarketAction.rejected, (state, action) => {
        state.create.status = 'failed'
        state.create.error =
          action.payload ?? { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create supermarket' }
      })
      .addCase(updateSupermarketAction.pending, (state) => {
        state.update.status = 'loading'
        state.update.error = null
      })
      .addCase(updateSupermarketAction.fulfilled, (state, action) => {
        state.update.status = 'succeeded'
        if (state.detail.entity && action.payload?.data) {
          state.detail.entity = action.payload.data
        }
      })
      .addCase(updateSupermarketAction.rejected, (state, action) => {
        state.update.status = 'failed'
        state.update.error =
          action.payload ?? { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update supermarket' }
      })
      .addCase(deleteSupermarketAction.pending, (state) => {
        state.delete.status = 'loading'
        state.delete.error = null
      })
      .addCase(deleteSupermarketAction.fulfilled, (state, action) => {
        state.delete.status = 'succeeded'
        const deletedUserId = action.payload?.userId
        if (deletedUserId) {
          state.list.items = state.list.items.filter((it) => String(it.user_id) !== String(deletedUserId))
        }
      })
      .addCase(deleteSupermarketAction.rejected, (state, action) => {
        state.delete.status = 'failed'
        state.delete.error =
          action.payload ?? { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete supermarket' }
      })
  },
})

export const { clearSupermarketsErrors, clearSupermarketDetail } = supermarketsSlice.actions

export const selectSupermarketsListItems = (state) => state.supermarkets.list.items
export const selectSupermarketsListMeta = (state) => state.supermarkets.list.meta
export const selectSupermarketsListStatus = (state) => state.supermarkets.list.status
export const selectSupermarketsListError = (state) => state.supermarkets.list.error

export const selectSupermarketDetail = (state) => state.supermarkets.detail.entity
export const selectSupermarketDetailStatus = (state) => state.supermarkets.detail.status
export const selectSupermarketDetailError = (state) => state.supermarkets.detail.error

export const selectSupermarketCreateStatus = (state) => state.supermarkets.create.status
export const selectSupermarketCreateError = (state) => state.supermarkets.create.error

export default supermarketsSlice.reducer

