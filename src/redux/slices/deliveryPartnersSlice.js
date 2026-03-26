import { createSlice } from '@reduxjs/toolkit'
import {
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
  },
})

export const { clearDeliveryPartnersError, clearDeliveryPartnerDetail } =
  deliveryPartnersSlice.actions

export const selectDeliveryPartnersListItems = (state) => state.deliveryPartners.list.items
export const selectDeliveryPartnersListMeta = (state) => state.deliveryPartners.list.meta
export const selectDeliveryPartnersListStatus = (state) => state.deliveryPartners.list.status
export const selectDeliveryPartnersListError = (state) => state.deliveryPartners.list.error

export const selectDeliveryPartnerDetail = (state) => state.deliveryPartners.detail.item
export const selectDeliveryPartnerDetailStatus = (state) => state.deliveryPartners.detail.status
export const selectDeliveryPartnerDetailError = (state) => state.deliveryPartners.detail.error

export default deliveryPartnersSlice.reducer

