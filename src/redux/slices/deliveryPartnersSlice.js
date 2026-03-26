import { createSlice } from '@reduxjs/toolkit'
import {
  blockDeliveryPartnerAction,
  deleteDeliveryPartnerAction,
  restoreDeliveryPartnerAction,
  fetchDeliveryPartnerDetailAction,
  fetchDeliveryPartnersAction,
} from '@/redux/thunks/deliveryPartnersThunks'

const initialState = {
  list: {
    items: [],
    meta: null,
    status: 'idle',
    error: null,
  },
  detail: {
    item: null,
    status: 'idle',
    error: null,
  },
  block: { status: 'idle', error: null },
  delete: { status: 'idle', error: null },
  restore: { status: 'idle', error: null },
}

const deliveryPartnersSlice = createSlice({
  name: 'deliveryPartners',
  initialState,
  reducers: {
    clearDeliveryPartnersError(state) {
      state.list.error = null
    },
    clearDeliveryPartnerDetail(state) {
      state.detail.item = null
      state.detail.status = 'idle'
      state.detail.error = null
    },
    clearDeliveryPartnerActionErrors(state) {
      state.block.error = null
      state.delete.error = null
      state.restore.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeliveryPartnersAction.pending, (state) => {
        state.list.status = 'loading'
        state.list.error = null
      })
      .addCase(fetchDeliveryPartnersAction.fulfilled, (state, action) => {
        state.list.status = 'succeeded'
        state.list.items = action.payload?.items ?? []
        state.list.meta = action.payload?.meta ?? null
      })
      .addCase(fetchDeliveryPartnersAction.rejected, (state, action) => {
        state.list.status = 'failed'
        state.list.error =
          action.payload ?? { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to load delivery partners' }
      })
      .addCase(fetchDeliveryPartnerDetailAction.pending, (state) => {
        state.detail.status = 'loading'
        state.detail.error = null
      })
      .addCase(fetchDeliveryPartnerDetailAction.fulfilled, (state, action) => {
        state.detail.status = 'succeeded'
        state.detail.item = action.payload ?? null
      })
      .addCase(fetchDeliveryPartnerDetailAction.rejected, (state, action) => {
        state.detail.status = 'failed'
        state.detail.error =
          action.payload ?? { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to load delivery partner detail' }
      })
      .addCase(blockDeliveryPartnerAction.pending, (state) => {
        state.block.status = 'loading'
        state.block.error = null
      })
      .addCase(blockDeliveryPartnerAction.fulfilled, (state, action) => {
        state.block.status = 'succeeded'
        const updated = action.payload ?? null
        if (updated && state.detail.item) {
          state.detail.item = { ...state.detail.item, ...updated }
        } else if (updated) {
          state.detail.item = updated
        }
      })
      .addCase(blockDeliveryPartnerAction.rejected, (state, action) => {
        state.block.status = 'failed'
        state.block.error =
          action.payload ?? { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to block/unblock delivery partner' }
      })
      .addCase(deleteDeliveryPartnerAction.pending, (state) => {
        state.delete.status = 'loading'
        state.delete.error = null
      })
      .addCase(deleteDeliveryPartnerAction.fulfilled, (state, action) => {
        state.delete.status = 'succeeded'
        const updated = action.payload ?? { is_deleted: true }
        if (state.detail.item) {
          state.detail.item = { ...state.detail.item, ...updated, is_deleted: true }
        }
      })
      .addCase(deleteDeliveryPartnerAction.rejected, (state, action) => {
        state.delete.status = 'failed'
        state.delete.error =
          action.payload ?? { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete delivery partner' }
      })
      .addCase(restoreDeliveryPartnerAction.pending, (state) => {
        state.restore.status = 'loading'
        state.restore.error = null
      })
      .addCase(restoreDeliveryPartnerAction.fulfilled, (state, action) => {
        state.restore.status = 'succeeded'
        const updated = action.payload ?? { is_deleted: false }
        if (state.detail.item) {
          state.detail.item = { ...state.detail.item, ...updated, is_deleted: false }
        } else if (updated) {
          state.detail.item = updated
        }
      })
      .addCase(restoreDeliveryPartnerAction.rejected, (state, action) => {
        state.restore.status = 'failed'
        state.restore.error =
          action.payload ?? { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to restore delivery partner' }
      })
  },
})

export const { clearDeliveryPartnersError, clearDeliveryPartnerDetail, clearDeliveryPartnerActionErrors } =
  deliveryPartnersSlice.actions

export const selectDeliveryPartnersListItems = (state) => state.deliveryPartners.list.items
export const selectDeliveryPartnersListMeta = (state) => state.deliveryPartners.list.meta
export const selectDeliveryPartnersListStatus = (state) => state.deliveryPartners.list.status
export const selectDeliveryPartnersListError = (state) => state.deliveryPartners.list.error

export const selectDeliveryPartnerDetail = (state) => state.deliveryPartners.detail.item
export const selectDeliveryPartnerDetailStatus = (state) => state.deliveryPartners.detail.status
export const selectDeliveryPartnerDetailError = (state) => state.deliveryPartners.detail.error

export const selectDeliveryPartnerBlockStatus = (state) => state.deliveryPartners.block.status
export const selectDeliveryPartnerBlockError = (state) => state.deliveryPartners.block.error
export const selectDeliveryPartnerDeleteStatus = (state) => state.deliveryPartners.delete.status
export const selectDeliveryPartnerDeleteError = (state) => state.deliveryPartners.delete.error
export const selectDeliveryPartnerRestoreStatus = (state) => state.deliveryPartners.restore.status
export const selectDeliveryPartnerRestoreError = (state) => state.deliveryPartners.restore.error

export default deliveryPartnersSlice.reducer

