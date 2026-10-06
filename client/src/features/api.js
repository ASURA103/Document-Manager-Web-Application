import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { logout, setCredentials } from './auth/authSlice.js'
import { normalizeApiBase } from './apiBase.js'

const baseQuery = fetchBaseQuery({
  baseUrl: normalizeApiBase(import.meta.env.VITE_B_URL),
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

// An expired/invalid token on an authenticated call sends the user back to login.
const baseQueryWithAuth = async (args, api, extra) => {
  const result = await baseQuery(args, api, extra)
  const isLogin = typeof args === 'object' && args.url === '/auth/login'
  if (result.error?.status === 401 && !isLogin) api.dispatch(logout())
  return result
}

export const errorMessage = (err, fallback = 'Something went wrong.') =>
  err?.data?.error?.message || (err?.status === 'FETCH_ERROR' ? 'Cannot reach the server.' : fallback)

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Docs', 'Doc', 'Shares', 'Versions', 'Comments'],
  endpoints: (b) => ({
    login: b.mutation({
      query: (credentials) => ({ url: '/auth/login', method: 'POST', body: credentials }),
      transformResponse: (r) => r.data,
      async onQueryStarted(_a, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials(data))
        } catch { /* failed login is surfaced by the caller via the mutation result */ }
      },
    }),

    getDocuments: b.query({ query: () => '/documents', transformResponse: (r) => r.data, providesTags: ['Docs'] }),
    getDocument: b.query({
      query: (id) => `/documents/${id}`,
      transformResponse: (r) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Doc', id }],
    }),
    createDocument: b.mutation({
      query: () => ({ url: '/documents', method: 'POST', body: {} }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['Docs'],
    }),
    importDocument: b.mutation({
      query: (file) => {
        const body = new FormData()
        body.append('file', file)
        return { url: '/documents/import', method: 'POST', body }
      },
      transformResponse: (r) => r.data,
      invalidatesTags: ['Docs'],
    }),
    updateDocument: b.mutation({
      query: ({ id, ...body }) => ({ url: `/documents/${id}`, method: 'PATCH', body }),
      transformResponse: (r) => r.data,
      // Patch the cached document with the server response instead of refetching,
      // so a save never re-renders/overwrites what the user is typing.
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(api.util.updateQueryData('getDocument', id, (draft) => { Object.assign(draft, data) }))
          dispatch(api.util.invalidateTags(['Docs', { type: 'Versions', id }]))
        } catch { /* surfaced by the caller */ }
      },
    }),
    // Presence: heartbeat returns everyone seen on the document recently (see server presence.service.js).
    heartbeat: b.mutation({ query: (id) => ({ url: `/documents/${id}/presence`, method: 'POST' }), transformResponse: (r) => r.data }),
    leavePresence: b.mutation({ query: (id) => ({ url: `/documents/${id}/presence`, method: 'DELETE' }) }),
    getVersions: b.query({
      query: (id) => `/documents/${id}/versions`,
      transformResponse: (r) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Versions', id }],
    }),
    getVersion: b.query({ query: ({ id, versionId }) => `/documents/${id}/versions/${versionId}`, transformResponse: (r) => r.data }),
    restoreVersion: b.mutation({
      query: ({ id, versionId }) => ({ url: `/documents/${id}/versions/${versionId}/restore`, method: 'POST' }),
      transformResponse: (r) => r.data,
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(api.util.updateQueryData('getDocument', id, (draft) => { draft.content = data.content; draft.updatedAt = data.updatedAt }))
          dispatch(api.util.invalidateTags(['Docs', { type: 'Versions', id }]))
        } catch { /* surfaced by the caller */ }
      },
    }),
    getComments: b.query({
      query: (id) => `/documents/${id}/comments`,
      transformResponse: (r) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Comments', id }],
    }),
    addComment: b.mutation({
      query: ({ id, body }) => ({ url: `/documents/${id}/comments`, method: 'POST', body: { body } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Comments', id }],
    }),
    updateComment: b.mutation({
      query: ({ id, commentId, resolved }) => ({ url: `/documents/${id}/comments/${commentId}`, method: 'PATCH', body: { resolved } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Comments', id }],
    }),
    deleteComment: b.mutation({
      query: ({ id, commentId }) => ({ url: `/documents/${id}/comments/${commentId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Comments', id }],
    }),
    deleteDocument: b.mutation({
      query: (id) => ({ url: `/documents/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Docs'],
    }),

    getShares: b.query({
      query: (id) => `/documents/${id}/shares`,
      transformResponse: (r) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Shares', id }],
    }),
    addShare: b.mutation({
      query: ({ id, ...body }) => ({ url: `/documents/${id}/shares`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Shares', id }],
    }),
    removeShare: b.mutation({
      query: ({ id, userId }) => ({ url: `/documents/${id}/shares/${userId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Shares', id }],
    }),
  }),
})

export const {
  useLoginMutation,
  useGetDocumentsQuery, useGetDocumentQuery, useCreateDocumentMutation, useImportDocumentMutation,
  useUpdateDocumentMutation, useDeleteDocumentMutation,
  useGetVersionsQuery, useGetVersionQuery, useRestoreVersionMutation,
  useGetCommentsQuery, useAddCommentMutation, useUpdateCommentMutation, useDeleteCommentMutation,
  useGetSharesQuery, useAddShareMutation, useRemoveShareMutation,
} = api
