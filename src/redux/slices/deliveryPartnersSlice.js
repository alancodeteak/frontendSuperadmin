import { createSlice } from '@reduxjs/toolkit'
import { fetchDeliveryPartnersAction } from '@/redux/thunks/deliveryPartnersThunks'

const initialState = {
  list: {
    items: [],
    meta: null,
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
  },
})

export const { clearDeliveryPartnersError } = deliveryPartnersSlice.actions

export const selectDeliveryPartnersListItems = (state) => state.deliveryPartners.list.items
export const selectDeliveryPartnersListMeta = (state) => state.deliveryPartners.list.meta
export const selectDeliveryPartnersListStatus = (state) => state.deliveryPartners.list.status
export const selectDeliveryPartnersListError = (state) => state.deliveryPartners.list.error

export default deliveryPartnersSlice.reducer

