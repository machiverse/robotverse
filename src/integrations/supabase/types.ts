export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      auction_bids: {
        Row: {
          auction_id: string
          bid_amount: number
          bidder_id: string
          created_at: string
          id: string
          is_auto_bid: boolean | null
          is_winning_bid: boolean | null
          max_auto_bid: number | null
        }
        Insert: {
          auction_id: string
          bid_amount: number
          bidder_id: string
          created_at?: string
          id?: string
          is_auto_bid?: boolean | null
          is_winning_bid?: boolean | null
          max_auto_bid?: number | null
        }
        Update: {
          auction_id?: string
          bid_amount?: number
          bidder_id?: string
          created_at?: string
          id?: string
          is_auto_bid?: boolean | null
          is_winning_bid?: boolean | null
          max_auto_bid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_watchlist: {
        Row: {
          auction_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          auction_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          auction_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_watchlist_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          auction_title: string
          auction_type: Database["public"]["Enums"]["auction_type"]
          auto_extend_minutes: number | null
          buy_now_price: number | null
          created_at: string
          currency: string
          current_highest_bid: number | null
          description: string | null
          end_time: string
          highest_bidder_id: string | null
          id: string
          images: string[] | null
          is_featured: boolean | null
          min_increment: number
          reserve_price: number | null
          robot_id: string | null
          seller_accepted: boolean | null
          seller_id: string
          start_time: string
          starting_price: number
          status: Database["public"]["Enums"]["auction_status"]
          total_bidders: number | null
          total_bids: number | null
          updated_at: string
          winner_id: string | null
          winner_notified: boolean | null
        }
        Insert: {
          auction_title: string
          auction_type?: Database["public"]["Enums"]["auction_type"]
          auto_extend_minutes?: number | null
          buy_now_price?: number | null
          created_at?: string
          currency?: string
          current_highest_bid?: number | null
          description?: string | null
          end_time: string
          highest_bidder_id?: string | null
          id?: string
          images?: string[] | null
          is_featured?: boolean | null
          min_increment?: number
          reserve_price?: number | null
          robot_id?: string | null
          seller_accepted?: boolean | null
          seller_id: string
          start_time: string
          starting_price?: number
          status?: Database["public"]["Enums"]["auction_status"]
          total_bidders?: number | null
          total_bids?: number | null
          updated_at?: string
          winner_id?: string | null
          winner_notified?: boolean | null
        }
        Update: {
          auction_title?: string
          auction_type?: Database["public"]["Enums"]["auction_type"]
          auto_extend_minutes?: number | null
          buy_now_price?: number | null
          created_at?: string
          currency?: string
          current_highest_bid?: number | null
          description?: string | null
          end_time?: string
          highest_bidder_id?: string | null
          id?: string
          images?: string[] | null
          is_featured?: boolean | null
          min_increment?: number
          reserve_price?: number | null
          robot_id?: string | null
          seller_accepted?: boolean | null
          seller_id?: string
          start_time?: string
          starting_price?: number
          status?: Database["public"]["Enums"]["auction_status"]
          total_bidders?: number | null
          total_bids?: number | null
          updated_at?: string
          winner_id?: string | null
          winner_notified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_robot_id_fkey"
            columns: ["robot_id"]
            isOneToOne: false
            referencedRelation: "robots"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_comments: {
        Row: {
          blog_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blog_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blog_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_likes: {
        Row: {
          blog_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blog_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blog_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_likes_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_shares: {
        Row: {
          blog_id: string
          created_at: string
          id: string
          shared_to: string | null
          user_id: string
        }
        Insert: {
          blog_id: string
          created_at?: string
          id?: string
          shared_to?: string | null
          user_id: string
        }
        Update: {
          blog_id?: string
          created_at?: string
          id?: string
          shared_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_shares_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_views: {
        Row: {
          blog_id: string
          id: string
          ip_address: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          blog_id: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          blog_id?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_views_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blogs: {
        Row: {
          author_id: string
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          like_count: number | null
          published_at: string | null
          share_count: number | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          like_count?: number | null
          published_at?: string | null
          share_count?: number | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          like_count?: number | null
          published_at?: string | null
          share_count?: number | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      button_interactions: {
        Row: {
          additional_data: Json | null
          button_name: string
          button_type: string
          created_at: string
          id: string
          item_id: string | null
          item_type: string | null
          page_url: string | null
          seller_company: string | null
          seller_email: string | null
          seller_id: string | null
          seller_location: string | null
          seller_mobile: string | null
          seller_name: string | null
          user_company: string | null
          user_email: string | null
          user_id: string | null
          user_location: string | null
          user_mobile: string | null
          user_name: string | null
        }
        Insert: {
          additional_data?: Json | null
          button_name: string
          button_type: string
          created_at?: string
          id?: string
          item_id?: string | null
          item_type?: string | null
          page_url?: string | null
          seller_company?: string | null
          seller_email?: string | null
          seller_id?: string | null
          seller_location?: string | null
          seller_mobile?: string | null
          seller_name?: string | null
          user_company?: string | null
          user_email?: string | null
          user_id?: string | null
          user_location?: string | null
          user_mobile?: string | null
          user_name?: string | null
        }
        Update: {
          additional_data?: Json | null
          button_name?: string
          button_type?: string
          created_at?: string
          id?: string
          item_id?: string | null
          item_type?: string | null
          page_url?: string | null
          seller_company?: string | null
          seller_email?: string | null
          seller_id?: string | null
          seller_location?: string | null
          seller_mobile?: string | null
          seller_name?: string | null
          user_company?: string | null
          user_email?: string | null
          user_id?: string | null
          user_location?: string | null
          user_mobile?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      buyer_access_requests: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          buyer_id: string
          created_at: string
          id: string
          inquiry_id: string
          inquiry_type: string
          item_id: string | null
          item_name: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          buyer_id: string
          created_at?: string
          id?: string
          inquiry_id: string
          inquiry_type: string
          item_id?: string | null
          item_name?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          buyer_id?: string
          created_at?: string
          id?: string
          inquiry_id?: string
          inquiry_type?: string
          item_id?: string | null
          item_name?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          buyer_id: string
          chat_id: string
          created_at: string | null
          id: string
          item_id: string | null
          item_name: string | null
          item_type: string
          last_message_at: string | null
          seller_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          chat_id?: string
          created_at?: string | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          item_type: string
          last_message_at?: string | null
          seller_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          chat_id?: string
          created_at?: string | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          item_type?: string
          last_message_at?: string | null
          seller_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          blocked_reason: string | null
          chat_session_id: string
          created_at: string | null
          id: string
          is_blocked: boolean | null
          is_read: boolean | null
          message_content: string
          product_metadata: Json | null
          read_at: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          blocked_reason?: string | null
          chat_session_id: string
          created_at?: string | null
          id?: string
          is_blocked?: boolean | null
          is_read?: boolean | null
          message_content: string
          product_metadata?: Json | null
          read_at?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          blocked_reason?: string | null
          chat_session_id?: string
          created_at?: string | null
          id?: string
          is_blocked?: boolean | null
          is_read?: boolean | null
          message_content?: string
          product_metadata?: Json | null
          read_at?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_new_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages_old: {
        Row: {
          blocked_reason: string | null
          chat_session_id: string
          created_at: string | null
          id: string
          is_blocked: boolean | null
          is_read: boolean | null
          message_content: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          blocked_reason?: string | null
          chat_session_id: string
          created_at?: string | null
          id?: string
          is_blocked?: boolean | null
          is_read?: boolean | null
          message_content: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          blocked_reason?: string | null
          chat_session_id?: string
          created_at?: string | null
          id?: string
          is_blocked?: boolean | null
          is_read?: boolean | null
          message_content?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions_old"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_notifications: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message_id: string | null
          notification_type: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_id?: string | null
          notification_type?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_id?: string | null
          notification_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          item_name: string | null
          item_type: string
          last_message_at: string | null
          product_details: Json | null
          status: string | null
          updated_at: string | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          item_type: string
          last_message_at?: string | null
          product_details?: Json | null
          status?: string | null
          updated_at?: string | null
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          item_type?: string
          last_message_at?: string | null
          product_details?: Json | null
          status?: string | null
          updated_at?: string | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      chat_sessions_old: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          item_name: string | null
          item_type: string
          last_message_at: string | null
          robot_id: string | null
          seller_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          item_name?: string | null
          item_type: string
          last_message_at?: string | null
          robot_id?: string | null
          seller_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          item_name?: string | null
          item_type?: string
          last_message_at?: string | null
          robot_id?: string | null
          seller_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      commission_invoices: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          deal_id: string
          deal_value: number
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          commission_amount: number
          commission_rate?: number
          created_at?: string
          deal_id: string
          deal_value: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          deal_id?: string
          deal_value?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_invoices_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          canonical_url: string | null
          category: string | null
          comment_count: number | null
          content: string | null
          created_at: string
          edit_history: Json | null
          edited_at: string | null
          excerpt: string | null
          featured_image: string | null
          featured_image_alt: string | null
          featured_image_caption: string | null
          focus_keywords: string[] | null
          id: string
          is_draft: boolean
          like_count: number | null
          media_type: string | null
          media_url: string | null
          meta_description: string | null
          meta_title: string | null
          post_type: string
          published_at: string | null
          reading_time_minutes: number | null
          scheduled_publish_at: string | null
          seo_tags: string[] | null
          share_count: number | null
          slug: string | null
          status: string
          tags: string[] | null
          title: string | null
          updated_at: string
          video_duration: number | null
          video_thumbnail: string | null
          view_count: number | null
        }
        Insert: {
          author_id: string
          canonical_url?: string | null
          category?: string | null
          comment_count?: number | null
          content?: string | null
          created_at?: string
          edit_history?: Json | null
          edited_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          featured_image_alt?: string | null
          featured_image_caption?: string | null
          focus_keywords?: string[] | null
          id?: string
          is_draft?: boolean
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          post_type: string
          published_at?: string | null
          reading_time_minutes?: number | null
          scheduled_publish_at?: string | null
          seo_tags?: string[] | null
          share_count?: number | null
          slug?: string | null
          status?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          video_duration?: number | null
          video_thumbnail?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string
          canonical_url?: string | null
          category?: string | null
          comment_count?: number | null
          content?: string | null
          created_at?: string
          edit_history?: Json | null
          edited_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          featured_image_alt?: string | null
          featured_image_caption?: string | null
          focus_keywords?: string[] | null
          id?: string
          is_draft?: boolean
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          post_type?: string
          published_at?: string | null
          reading_time_minutes?: number | null
          scheduled_publish_at?: string | null
          seo_tags?: string[] | null
          share_count?: number | null
          slug?: string | null
          status?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          video_duration?: number | null
          video_thumbnail?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      content_interactions: {
        Row: {
          comment_text: string | null
          content_id: string
          content_type: string
          created_at: string
          id: string
          interaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text?: string | null
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          interaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          interaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coverage_areas: {
        Row: {
          area_name: string
          area_type: string
          base_rate: number
          country_name: string | null
          created_at: string
          delivery_time: string
          id: string
          is_active: boolean | null
          per_kg_rate: number
          provider_id: string
          state_name: string | null
          updated_at: string
          zone_type: string
        }
        Insert: {
          area_name: string
          area_type?: string
          base_rate?: number
          country_name?: string | null
          created_at?: string
          delivery_time?: string
          id?: string
          is_active?: boolean | null
          per_kg_rate?: number
          provider_id: string
          state_name?: string | null
          updated_at?: string
          zone_type?: string
        }
        Update: {
          area_name?: string
          area_type?: string
          base_rate?: number
          country_name?: string | null
          created_at?: string
          delivery_time?: string
          id?: string
          is_active?: boolean | null
          per_kg_rate?: number
          provider_id?: string
          state_name?: string | null
          updated_at?: string
          zone_type?: string
        }
        Relationships: []
      }
      credit_packs: {
        Row: {
          bonus_credits: number | null
          created_at: string
          credits_amount: number
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          pack_name: string
          price: number
        }
        Insert: {
          bonus_credits?: number | null
          created_at?: string
          credits_amount: number
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          pack_name: string
          price: number
        }
        Update: {
          bonus_credits?: number | null
          created_at?: string
          credits_amount?: number
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          pack_name?: string
          price?: number
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          balance_after: number
          balance_before: number
          created_at: string
          credits_amount: number
          description: string | null
          id: string
          payment_id: string | null
          payment_status: string | null
          reference_id: string | null
          reference_type: string | null
          seller_id: string
          transaction_type: string
        }
        Insert: {
          balance_after: number
          balance_before: number
          created_at?: string
          credits_amount: number
          description?: string | null
          id?: string
          payment_id?: string | null
          payment_status?: string | null
          reference_id?: string | null
          reference_type?: string | null
          seller_id: string
          transaction_type: string
        }
        Update: {
          balance_after?: number
          balance_before?: number
          created_at?: string
          credits_amount?: number
          description?: string | null
          id?: string
          payment_id?: string | null
          payment_status?: string | null
          reference_id?: string | null
          reference_type?: string | null
          seller_id?: string
          transaction_type?: string
        }
        Relationships: []
      }
      crm_accounts: {
        Row: {
          account_name: string
          account_type: string | null
          annual_revenue: number | null
          billing_address: string | null
          city: string | null
          company_size: string | null
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          email: string | null
          gst_number: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          last_order_date: string | null
          logo_url: string | null
          pan_number: string | null
          phone: string | null
          pincode: string | null
          seller_id: string
          shipping_address: string | null
          state: string | null
          total_orders: number | null
          total_revenue: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          account_name: string
          account_type?: string | null
          annual_revenue?: number | null
          billing_address?: string | null
          city?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          last_order_date?: string | null
          logo_url?: string | null
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          seller_id: string
          shipping_address?: string | null
          state?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_name?: string
          account_type?: string | null
          annual_revenue?: number | null
          billing_address?: string | null
          city?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          last_order_date?: string | null
          logo_url?: string | null
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          seller_id?: string
          shipping_address?: string | null
          state?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      crm_activity_logs: {
        Row: {
          account_id: string | null
          activity_type: string
          attachments: Json | null
          call_direction: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          email_body: string | null
          email_subject: string | null
          id: string
          lead_id: string | null
          logged_at: string | null
          opportunity_id: string | null
          outcome: string | null
          seller_id: string
          subject: string
        }
        Insert: {
          account_id?: string | null
          activity_type: string
          attachments?: Json | null
          call_direction?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          email_body?: string | null
          email_subject?: string | null
          id?: string
          lead_id?: string | null
          logged_at?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          seller_id: string
          subject: string
        }
        Update: {
          account_id?: string | null
          activity_type?: string
          attachments?: Json | null
          call_direction?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          email_body?: string | null
          email_subject?: string | null
          id?: string
          lead_id?: string | null
          logged_at?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          seller_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activity_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activity_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activity_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "seller_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activity_logs_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          account_id: string | null
          created_at: string
          department: string | null
          designation: string | null
          email: string | null
          first_name: string
          id: string
          is_decision_maker: boolean | null
          is_primary: boolean | null
          last_name: string | null
          linkedin_url: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          seller_id: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_decision_maker?: boolean | null
          is_primary?: boolean | null
          last_name?: string | null
          linkedin_url?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          seller_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_decision_maker?: boolean | null
          is_primary?: boolean | null
          last_name?: string | null
          linkedin_url?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_documents: {
        Row: {
          account_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_approved: boolean | null
          lead_id: string | null
          mime_type: string | null
          notes: string | null
          opportunity_id: string | null
          quotation_id: string | null
          seller_id: string
          updated_at: string
          version: number | null
        }
        Insert: {
          account_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_approved?: boolean | null
          lead_id?: string | null
          mime_type?: string | null
          notes?: string | null
          opportunity_id?: string | null
          quotation_id?: string | null
          seller_id: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          account_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_approved?: boolean | null
          lead_id?: string | null
          mime_type?: string | null
          notes?: string | null
          opportunity_id?: string | null
          quotation_id?: string | null
          seller_id?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_documents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "seller_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_documents_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_documents_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "crm_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_opportunities: {
        Row: {
          account_id: string | null
          actual_close_date: string | null
          assigned_to: string | null
          competitors: string[] | null
          created_at: string
          currency: string | null
          description: string | null
          expected_close_date: string | null
          expected_value: number | null
          id: string
          is_closed: boolean | null
          lead_id: string | null
          loss_reason: string | null
          next_step: string | null
          opportunity_name: string
          opportunity_number: string
          probability: number | null
          products: Json | null
          seller_id: string
          stage: string | null
          updated_at: string
          weighted_value: number | null
          win_reason: string | null
        }
        Insert: {
          account_id?: string | null
          actual_close_date?: string | null
          assigned_to?: string | null
          competitors?: string[] | null
          created_at?: string
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          expected_value?: number | null
          id?: string
          is_closed?: boolean | null
          lead_id?: string | null
          loss_reason?: string | null
          next_step?: string | null
          opportunity_name: string
          opportunity_number?: string
          probability?: number | null
          products?: Json | null
          seller_id: string
          stage?: string | null
          updated_at?: string
          weighted_value?: number | null
          win_reason?: string | null
        }
        Update: {
          account_id?: string | null
          actual_close_date?: string | null
          assigned_to?: string | null
          competitors?: string[] | null
          created_at?: string
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          expected_value?: number | null
          id?: string
          is_closed?: boolean | null
          lead_id?: string | null
          loss_reason?: string | null
          next_step?: string | null
          opportunity_name?: string
          opportunity_number?: string
          probability?: number | null
          products?: Json | null
          seller_id?: string
          stage?: string | null
          updated_at?: string
          weighted_value?: number | null
          win_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_opportunities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "seller_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_lost_stage: boolean | null
          is_won_stage: boolean | null
          probability: number | null
          seller_id: string
          stage_name: string
          stage_order: number
          stage_type: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_lost_stage?: boolean | null
          is_won_stage?: boolean | null
          probability?: number | null
          seller_id: string
          stage_name: string
          stage_order: number
          stage_type?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_lost_stage?: boolean | null
          is_won_stage?: boolean | null
          probability?: number | null
          seller_id?: string
          stage_name?: string
          stage_order?: number
          stage_type?: string | null
        }
        Relationships: []
      }
      crm_quotations: {
        Row: {
          accepted_at: string | null
          account_id: string | null
          buyer_address: string | null
          buyer_company: string | null
          buyer_email: string | null
          buyer_name: string
          buyer_phone: string | null
          created_at: string
          currency: string | null
          discount_amount: number | null
          discount_type: string | null
          discount_value: number | null
          id: string
          items: Json
          lead_id: string | null
          notes: string | null
          opportunity_id: string | null
          parent_quotation_id: string | null
          quotation_number: string
          rejected_at: string | null
          rejection_reason: string | null
          revision_history: Json | null
          seller_id: string
          sent_at: string | null
          shipping_amount: number | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          terms_conditions: string | null
          total_amount: number
          updated_at: string
          valid_until: string | null
          version: number | null
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          account_id?: string | null
          buyer_address?: string | null
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_name: string
          buyer_phone?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          items?: Json
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          parent_quotation_id?: string | null
          quotation_number?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          revision_history?: Json | null
          seller_id: string
          sent_at?: string | null
          shipping_amount?: number | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms_conditions?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          version?: number | null
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          account_id?: string | null
          buyer_address?: string | null
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          items?: Json
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          parent_quotation_id?: string | null
          quotation_number?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          revision_history?: Json | null
          seller_id?: string
          sent_at?: string | null
          shipping_amount?: number | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms_conditions?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          version?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_quotations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "seller_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotations_parent_quotation_id_fkey"
            columns: ["parent_quotation_id"]
            isOneToOne: false
            referencedRelation: "crm_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          account_id: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          duration_minutes: number | null
          id: string
          lead_id: string | null
          opportunity_id: string | null
          outcome: string | null
          priority: string | null
          reminder_at: string | null
          seller_id: string
          status: string | null
          subject: string
          task_type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          priority?: string | null
          reminder_at?: string | null
          seller_id: string
          status?: string | null
          subject: string
          task_type: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          priority?: string | null
          reminder_at?: string | null
          seller_id?: string
          status?: string | null
          subject?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "seller_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          admin_notes: string | null
          admin_verified: boolean | null
          admin_verified_at: string | null
          admin_verified_by: string | null
          attachments: Json | null
          buyer_company: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string
          buyer_phone: string | null
          closing_date: string | null
          commission_amount: number | null
          commission_rate: number
          created_at: string
          deal_number: string
          deal_status: string
          id: string
          notes: string | null
          product_id: string | null
          product_name: string
          product_type: string | null
          quote_value: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          admin_verified?: boolean | null
          admin_verified_at?: string | null
          admin_verified_by?: string | null
          attachments?: Json | null
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name: string
          buyer_phone?: string | null
          closing_date?: string | null
          commission_amount?: number | null
          commission_rate?: number
          created_at?: string
          deal_number?: string
          deal_status?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name: string
          product_type?: string | null
          quote_value?: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          admin_verified?: boolean | null
          admin_verified_at?: string | null
          admin_verified_by?: string | null
          attachments?: Json | null
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          closing_date?: string | null
          commission_amount?: number | null
          commission_rate?: number
          created_at?: string
          deal_number?: string
          deal_status?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string
          product_type?: string | null
          quote_value?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_uploads: {
        Row: {
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string
          user_id: string
        }
        Update: {
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      item_view_counts: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          total_views: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          total_views?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          total_views?: number
          updated_at?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applicant_id: string
          applied_at: string
          cover_letter: string | null
          id: string
          job_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          applicant_id: string
          applied_at?: string
          cover_letter?: string | null
          id?: string
          job_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          applied_at?: string
          cover_letter?: string | null
          id?: string
          job_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "talent_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_seeker_profiles: {
        Row: {
          availability: string | null
          bio: string | null
          city: string | null
          created_at: string
          expected_salary_max: number | null
          expected_salary_min: number | null
          experience_areas: string[] | null
          headline: string | null
          id: string
          is_active: boolean | null
          location: string | null
          preferred_role: string | null
          projects_completed: number | null
          resume_url: string | null
          robot_brands: string[] | null
          skills: string[] | null
          total_experience_years: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          expected_salary_max?: number | null
          expected_salary_min?: number | null
          experience_areas?: string[] | null
          headline?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          preferred_role?: string | null
          projects_completed?: number | null
          resume_url?: string | null
          robot_brands?: string[] | null
          skills?: string[] | null
          total_experience_years?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          expected_salary_max?: number | null
          expected_salary_min?: number | null
          experience_areas?: string[] | null
          headline?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          preferred_role?: string | null
          projects_completed?: number | null
          resume_url?: string | null
          robot_brands?: string[] | null
          skills?: string[] | null
          total_experience_years?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          is_completed: boolean | null
          lead_id: string
          reminder_at: string | null
          scheduled_at: string | null
          seller_id: string
          title: string
        }
        Insert: {
          activity_type: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          lead_id: string
          reminder_at?: string | null
          scheduled_at?: string | null
          seller_id: string
          title: string
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          lead_id?: string
          reminder_at?: string | null
          scheduled_at?: string | null
          seller_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "seller_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_applications: {
        Row: {
          amount_requested: number
          applicant_email: string | null
          applicant_id: string | null
          applicant_name: string
          applicant_phone: string | null
          application_id: string
          applied_date: string | null
          business_type: string | null
          business_vintage_months: number | null
          collateral_offered: string | null
          created_at: string
          credit_score: number | null
          documents_submitted: string[] | null
          id: string
          loan_type: string
          monthly_income: number | null
          notes: string | null
          provider_id: string | null
          purpose: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount_requested: number
          applicant_email?: string | null
          applicant_id?: string | null
          applicant_name: string
          applicant_phone?: string | null
          application_id?: string
          applied_date?: string | null
          business_type?: string | null
          business_vintage_months?: number | null
          collateral_offered?: string | null
          created_at?: string
          credit_score?: number | null
          documents_submitted?: string[] | null
          id?: string
          loan_type: string
          monthly_income?: number | null
          notes?: string | null
          provider_id?: string | null
          purpose?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount_requested?: number
          applicant_email?: string | null
          applicant_id?: string | null
          applicant_name?: string
          applicant_phone?: string | null
          application_id?: string
          applied_date?: string | null
          business_type?: string | null
          business_vintage_months?: number | null
          collateral_offered?: string | null
          created_at?: string
          credit_score?: number | null
          documents_submitted?: string[] | null
          id?: string
          loan_type?: string
          monthly_income?: number | null
          notes?: string | null
          provider_id?: string | null
          purpose?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      loan_products: {
        Row: {
          collateral_required: boolean | null
          created_at: string
          description: string | null
          digital_process: boolean | null
          eligibility_criteria: string | null
          id: string
          is_active: boolean | null
          loan_type: string[]
          max_amount: number
          max_interest_rate: number | null
          max_tenure_months: number | null
          min_amount: number | null
          min_interest_rate: number | null
          min_tenure_months: number | null
          prepayment_allowed: boolean | null
          processing_fee_percentage: number | null
          product_name: string
          provider_id: string
          quick_approval: boolean | null
          required_documents: string[] | null
          updated_at: string
        }
        Insert: {
          collateral_required?: boolean | null
          created_at?: string
          description?: string | null
          digital_process?: boolean | null
          eligibility_criteria?: string | null
          id?: string
          is_active?: boolean | null
          loan_type: string[]
          max_amount: number
          max_interest_rate?: number | null
          max_tenure_months?: number | null
          min_amount?: number | null
          min_interest_rate?: number | null
          min_tenure_months?: number | null
          prepayment_allowed?: boolean | null
          processing_fee_percentage?: number | null
          product_name: string
          provider_id: string
          quick_approval?: boolean | null
          required_documents?: string[] | null
          updated_at?: string
        }
        Update: {
          collateral_required?: boolean | null
          created_at?: string
          description?: string | null
          digital_process?: boolean | null
          eligibility_criteria?: string | null
          id?: string
          is_active?: boolean | null
          loan_type?: string[]
          max_amount?: number
          max_interest_rate?: number | null
          max_tenure_months?: number | null
          min_amount?: number | null
          min_interest_rate?: number | null
          min_tenure_months?: number | null
          prepayment_allowed?: boolean | null
          processing_fee_percentage?: number | null
          product_name?: string
          provider_id?: string
          quick_approval?: boolean | null
          required_documents?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_products_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      loan_schemes: {
        Row: {
          created_at: string
          description: string | null
          eligibility_criteria: string | null
          features: string[] | null
          id: string
          interest_rate_max: number
          interest_rate_min: number
          is_active: boolean | null
          is_government_scheme: boolean | null
          max_amount: number
          max_tenure_months: number
          min_tenure_months: number | null
          processing_fee_percentage: number | null
          provider_id: string
          scheme_name: string
          scheme_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          eligibility_criteria?: string | null
          features?: string[] | null
          id?: string
          interest_rate_max: number
          interest_rate_min: number
          is_active?: boolean | null
          is_government_scheme?: boolean | null
          max_amount: number
          max_tenure_months: number
          min_tenure_months?: number | null
          processing_fee_percentage?: number | null
          provider_id: string
          scheme_name: string
          scheme_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          eligibility_criteria?: string | null
          features?: string[] | null
          id?: string
          interest_rate_max?: number
          interest_rate_min?: number
          is_active?: boolean | null
          is_government_scheme?: boolean | null
          max_amount?: number
          max_tenure_months?: number
          min_tenure_months?: number | null
          processing_fee_percentage?: number | null
          provider_id?: string
          scheme_name?: string
          scheme_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      logistics_coverage: {
        Row: {
          area_name: string
          base_rate: number
          created_at: string | null
          delivery_time: string
          id: string
          is_active: boolean | null
          per_kg_rate: number
          provider_id: string | null
          updated_at: string | null
          zone_type: string
        }
        Insert: {
          area_name: string
          base_rate: number
          created_at?: string | null
          delivery_time: string
          id?: string
          is_active?: boolean | null
          per_kg_rate: number
          provider_id?: string | null
          updated_at?: string | null
          zone_type: string
        }
        Update: {
          area_name?: string
          base_rate?: number
          created_at?: string | null
          delivery_time?: string
          id?: string
          is_active?: boolean | null
          per_kg_rate?: number
          provider_id?: string | null
          updated_at?: string | null
          zone_type?: string
        }
        Relationships: []
      }
      logistics_fleet: {
        Row: {
          capacity_volume: number | null
          capacity_weight: number
          created_at: string | null
          current_location: string | null
          driver_license: string | null
          driver_name: string
          driver_phone: string | null
          fuel_type: string | null
          id: string
          insurance_expiry: string | null
          last_maintenance: string | null
          license_plate: string
          provider_id: string | null
          status: string | null
          updated_at: string | null
          vehicle_type: string
        }
        Insert: {
          capacity_volume?: number | null
          capacity_weight: number
          created_at?: string | null
          current_location?: string | null
          driver_license?: string | null
          driver_name: string
          driver_phone?: string | null
          fuel_type?: string | null
          id?: string
          insurance_expiry?: string | null
          last_maintenance?: string | null
          license_plate: string
          provider_id?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_type: string
        }
        Update: {
          capacity_volume?: number | null
          capacity_weight?: number
          created_at?: string | null
          current_location?: string | null
          driver_license?: string | null
          driver_name?: string
          driver_phone?: string | null
          fuel_type?: string | null
          id?: string
          insurance_expiry?: string | null
          last_maintenance?: string | null
          license_plate?: string
          provider_id?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      logistics_services: {
        Row: {
          base_price: number | null
          container_20ft_max: number | null
          container_20ft_min: number | null
          container_40ft_max: number | null
          container_40ft_min: number | null
          coverage_areas: string[] | null
          created_at: string
          delivery_time_hours: number | null
          description: string | null
          emergency_delivery: boolean | null
          id: string
          insurance_included: boolean | null
          international_coverage: string[] | null
          is_active: boolean | null
          is_international: boolean | null
          max_volume_m3: number | null
          max_weight_kg: number | null
          price_per_kg: number | null
          price_per_km: number | null
          provider_id: string
          service_name: string
          service_type: string
          special_handling: boolean | null
          tracking_available: boolean | null
          transport_modes: string[] | null
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          container_20ft_max?: number | null
          container_20ft_min?: number | null
          container_40ft_max?: number | null
          container_40ft_min?: number | null
          coverage_areas?: string[] | null
          created_at?: string
          delivery_time_hours?: number | null
          description?: string | null
          emergency_delivery?: boolean | null
          id?: string
          insurance_included?: boolean | null
          international_coverage?: string[] | null
          is_active?: boolean | null
          is_international?: boolean | null
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          price_per_kg?: number | null
          price_per_km?: number | null
          provider_id: string
          service_name: string
          service_type: string
          special_handling?: boolean | null
          tracking_available?: boolean | null
          transport_modes?: string[] | null
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          container_20ft_max?: number | null
          container_20ft_min?: number | null
          container_40ft_max?: number | null
          container_40ft_min?: number | null
          coverage_areas?: string[] | null
          created_at?: string
          delivery_time_hours?: number | null
          description?: string | null
          emergency_delivery?: boolean | null
          id?: string
          insurance_included?: boolean | null
          international_coverage?: string[] | null
          is_active?: boolean | null
          is_international?: boolean | null
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          price_per_kg?: number | null
          price_per_km?: number | null
          provider_id?: string
          service_name?: string
          service_type?: string
          special_handling?: boolean | null
          tracking_available?: boolean | null
          transport_modes?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      logistics_shipments: {
        Row: {
          actual_delivery: string | null
          cargo_type: string
          client_email: string | null
          client_name: string
          cost: number
          created_at: string | null
          currency: string | null
          delivery_location: string
          estimated_delivery: string
          id: string
          pickup_location: string
          provider_id: string
          shipment_id: string
          status: string | null
          tracking_number: string
          updated_at: string | null
          weight: number
        }
        Insert: {
          actual_delivery?: string | null
          cargo_type: string
          client_email?: string | null
          client_name: string
          cost: number
          created_at?: string | null
          currency?: string | null
          delivery_location: string
          estimated_delivery: string
          id?: string
          pickup_location: string
          provider_id: string
          shipment_id?: string
          status?: string | null
          tracking_number?: string
          updated_at?: string | null
          weight: number
        }
        Update: {
          actual_delivery?: string | null
          cargo_type?: string
          client_email?: string | null
          client_name?: string
          cost?: number
          created_at?: string | null
          currency?: string | null
          delivery_location?: string
          estimated_delivery?: string
          id?: string
          pickup_location?: string
          provider_id?: string
          shipment_id?: string
          status?: string | null
          tracking_number?: string
          updated_at?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "logistics_shipments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          reference_id: string | null
          reference_type: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          like_count: number | null
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          like_count?: number | null
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          like_count?: number | null
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          shared_to: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          shared_to?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          shared_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          avatar_url: string | null
          average_rating: number | null
          city: string | null
          company_logo_url: string | null
          company_name: string | null
          completed_sales: number | null
          created_at: string
          credits_balance: number | null
          email: string | null
          finance_type: string[] | null
          financing_for: string[] | null
          full_address: string | null
          full_name: string | null
          government_scheme_support: boolean | null
          id: string
          is_employer: boolean | null
          is_job_seeker: boolean | null
          is_trainer: boolean | null
          location: string | null
          logistics_region: string | null
          logistics_type: string | null
          mobile_number: string | null
          mou_agreed: boolean | null
          mou_agreed_at: string | null
          phone: string | null
          pincode: string | null
          primary_role: string | null
          primary_user_type:
            | Database["public"]["Enums"]["user_type_enum"]
            | null
          registration_complete: boolean | null
          seller_model_type: string | null
          seller_roles: string[] | null
          service_categories: string[] | null
          target_audience: string[] | null
          total_reviews: number | null
          transport_modes: string[] | null
          updated_at: string
          user_id: string
          user_roles: string[] | null
          user_type: string | null
          warehouse_storage: boolean | null
        }
        Insert: {
          account_type?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          city?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          completed_sales?: number | null
          created_at?: string
          credits_balance?: number | null
          email?: string | null
          finance_type?: string[] | null
          financing_for?: string[] | null
          full_address?: string | null
          full_name?: string | null
          government_scheme_support?: boolean | null
          id?: string
          is_employer?: boolean | null
          is_job_seeker?: boolean | null
          is_trainer?: boolean | null
          location?: string | null
          logistics_region?: string | null
          logistics_type?: string | null
          mobile_number?: string | null
          mou_agreed?: boolean | null
          mou_agreed_at?: string | null
          phone?: string | null
          pincode?: string | null
          primary_role?: string | null
          primary_user_type?:
            | Database["public"]["Enums"]["user_type_enum"]
            | null
          registration_complete?: boolean | null
          seller_model_type?: string | null
          seller_roles?: string[] | null
          service_categories?: string[] | null
          target_audience?: string[] | null
          total_reviews?: number | null
          transport_modes?: string[] | null
          updated_at?: string
          user_id: string
          user_roles?: string[] | null
          user_type?: string | null
          warehouse_storage?: boolean | null
        }
        Update: {
          account_type?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          city?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          completed_sales?: number | null
          created_at?: string
          credits_balance?: number | null
          email?: string | null
          finance_type?: string[] | null
          financing_for?: string[] | null
          full_address?: string | null
          full_name?: string | null
          government_scheme_support?: boolean | null
          id?: string
          is_employer?: boolean | null
          is_job_seeker?: boolean | null
          is_trainer?: boolean | null
          location?: string | null
          logistics_region?: string | null
          logistics_type?: string | null
          mobile_number?: string | null
          mou_agreed?: boolean | null
          mou_agreed_at?: string | null
          phone?: string | null
          pincode?: string | null
          primary_role?: string | null
          primary_user_type?:
            | Database["public"]["Enums"]["user_type_enum"]
            | null
          registration_complete?: boolean | null
          seller_model_type?: string | null
          seller_roles?: string[] | null
          service_categories?: string[] | null
          target_audience?: string[] | null
          total_reviews?: number | null
          transport_modes?: string[] | null
          updated_at?: string
          user_id?: string
          user_roles?: string[] | null
          user_type?: string | null
          warehouse_storage?: boolean | null
        }
        Relationships: []
      }
      razorpay_orders: {
        Row: {
          amount: number
          created_at: string
          credits: number
          currency: string
          id: string
          pack_id: string | null
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          credits: number
          currency?: string
          id?: string
          pack_id?: string | null
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          credits?: number
          currency?: string
          id?: string
          pack_id?: string | null
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "razorpay_orders_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "credit_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      razorpay_webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
        }
        Relationships: []
      }
      request_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          product_details: string | null
          quotation_amount: number | null
          quotation_details: string | null
          request_id: string
          response_at: string | null
          seller_id: string
          seller_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          product_details?: string | null
          quotation_amount?: number | null
          quotation_details?: string | null
          request_id: string
          response_at?: string | null
          seller_id: string
          seller_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          product_details?: string | null
          quotation_amount?: number | null
          quotation_details?: string | null
          request_id?: string
          response_at?: string | null
          seller_id?: string
          seller_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "user_product_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          admin_notes: string | null
          communication_rating: number | null
          created_at: string
          deal_type: string
          delivery_rating: number | null
          feedback_text: string | null
          hidden_reason: string | null
          id: string
          is_featured: boolean | null
          is_verified: boolean | null
          item_id: string | null
          item_type: string
          overall_rating: number
          reviewed_user_id: string | null
          reviewer_avatar_url: string | null
          reviewer_company: string | null
          reviewer_id: string
          reviewer_name: string | null
          reviewer_role: string
          service_quality_rating: number | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          communication_rating?: number | null
          created_at?: string
          deal_type: string
          delivery_rating?: number | null
          feedback_text?: string | null
          hidden_reason?: string | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          item_id?: string | null
          item_type: string
          overall_rating: number
          reviewed_user_id?: string | null
          reviewer_avatar_url?: string | null
          reviewer_company?: string | null
          reviewer_id: string
          reviewer_name?: string | null
          reviewer_role: string
          service_quality_rating?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          communication_rating?: number | null
          created_at?: string
          deal_type?: string
          delivery_rating?: number | null
          feedback_text?: string | null
          hidden_reason?: string | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          item_id?: string | null
          item_type?: string
          overall_rating?: number
          reviewed_user_id?: string | null
          reviewer_avatar_url?: string | null
          reviewer_company?: string | null
          reviewer_id?: string
          reviewer_name?: string | null
          reviewer_role?: string
          service_quality_rating?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      robot_ai_analysis: {
        Row: {
          analysis_data: Json
          created_at: string
          id: string
          recommendations: Json
          robot_id: string
          updated_at: string
        }
        Insert: {
          analysis_data: Json
          created_at?: string
          id?: string
          recommendations?: Json
          robot_id: string
          updated_at?: string
        }
        Update: {
          analysis_data?: Json
          created_at?: string
          id?: string
          recommendations?: Json
          robot_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      robot_custom_fields: {
        Row: {
          created_at: string
          field_name: string
          field_value: string
          id: string
          robot_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_name: string
          field_value: string
          id?: string
          robot_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_name?: string
          field_value?: string
          id?: string
          robot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "robot_custom_fields_robot_id_fkey"
            columns: ["robot_id"]
            isOneToOne: false
            referencedRelation: "robots"
            referencedColumns: ["id"]
          },
        ]
      }
      robot_reports: {
        Row: {
          created_at: string
          id: string
          report_content: string
          robot_data: Json | null
          robot_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_content: string
          robot_data?: Json | null
          robot_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report_content?: string
          robot_data?: Json | null
          robot_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      robot_view_counts: {
        Row: {
          created_at: string
          id: string
          robot_id: string
          total_views: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          robot_id: string
          total_views?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          robot_id?: string
          total_views?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "robot_view_counts_robot_id_fkey"
            columns: ["robot_id"]
            isOneToOne: true
            referencedRelation: "robots"
            referencedColumns: ["id"]
          },
        ]
      }
      robots: {
        Row: {
          applications: string[] | null
          availability: string | null
          brand: string | null
          brochure_url: string | null
          category_tags: string[] | null
          certification_standards: string[] | null
          condition: string | null
          controller_type: string | null
          created_at: string
          currency: string | null
          description: string | null
          financing_available: boolean
          id: string
          images: string[] | null
          included_accessories: string[] | null
          installation_service: boolean
          location: string | null
          maintenance_contract: boolean
          model: string | null
          name: string
          operating_environment: string | null
          payload_capacity: number | null
          pincode: string | null
          power_consumption: number | null
          price: number | null
          quantity: number
          reach: number | null
          repeatability: number | null
          robot_type: string
          seller_id: string
          state: string | null
          technical_specifications: Json | null
          training_included: boolean
          updated_at: string | null
          video_type: string | null
          video_url: string | null
          warranty_info: string | null
          year_manufactured: number | null
        }
        Insert: {
          applications?: string[] | null
          availability?: string | null
          brand?: string | null
          brochure_url?: string | null
          category_tags?: string[] | null
          certification_standards?: string[] | null
          condition?: string | null
          controller_type?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          financing_available?: boolean
          id?: string
          images?: string[] | null
          included_accessories?: string[] | null
          installation_service?: boolean
          location?: string | null
          maintenance_contract?: boolean
          model?: string | null
          name: string
          operating_environment?: string | null
          payload_capacity?: number | null
          pincode?: string | null
          power_consumption?: number | null
          price?: number | null
          quantity?: number
          reach?: number | null
          repeatability?: number | null
          robot_type: string
          seller_id: string
          state?: string | null
          technical_specifications?: Json | null
          training_included?: boolean
          updated_at?: string | null
          video_type?: string | null
          video_url?: string | null
          warranty_info?: string | null
          year_manufactured?: number | null
        }
        Update: {
          applications?: string[] | null
          availability?: string | null
          brand?: string | null
          brochure_url?: string | null
          category_tags?: string[] | null
          certification_standards?: string[] | null
          condition?: string | null
          controller_type?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          financing_available?: boolean
          id?: string
          images?: string[] | null
          included_accessories?: string[] | null
          installation_service?: boolean
          location?: string | null
          maintenance_contract?: boolean
          model?: string | null
          name?: string
          operating_environment?: string | null
          payload_capacity?: number | null
          pincode?: string | null
          power_consumption?: number | null
          price?: number | null
          quantity?: number
          reach?: number | null
          repeatability?: number | null
          robot_type?: string
          seller_id?: string
          state?: string | null
          technical_specifications?: Json | null
          training_included?: boolean
          updated_at?: string | null
          video_type?: string | null
          video_url?: string | null
          warranty_info?: string | null
          year_manufactured?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "robots_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "talent_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_credit_transactions: {
        Row: {
          balance_after: number
          created_at: string
          credits_amount: number
          description: string | null
          id: string
          lead_id: string | null
          seller_id: string
          transaction_type: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          credits_amount: number
          description?: string | null
          id?: string
          lead_id?: string | null
          seller_id: string
          transaction_type: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          credits_amount?: number
          description?: string | null
          id?: string
          lead_id?: string | null
          seller_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_credit_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "seller_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_credits: {
        Row: {
          created_at: string
          current_balance: number
          id: string
          next_credit_refresh: string | null
          seller_id: string
          subscription_end_date: string | null
          subscription_plan_id: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          total_earned: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          id?: string
          next_credit_refresh?: string | null
          seller_id: string
          subscription_end_date?: string | null
          subscription_plan_id?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          total_earned?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          id?: string
          next_credit_refresh?: string | null
          seller_id?: string
          subscription_end_date?: string | null
          subscription_plan_id?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          total_earned?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_credits_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_invoices: {
        Row: {
          buyer_address: string | null
          buyer_company: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string
          buyer_phone: string | null
          created_at: string
          currency: string | null
          discount_amount: number | null
          due_date: string | null
          id: string
          invoice_number: string
          items: Json
          lead_id: string | null
          notes: string | null
          paid_at: string | null
          seller_id: string
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          terms: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_address?: string | null
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name: string
          buyer_phone?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          items?: Json
          lead_id?: string | null
          notes?: string | null
          paid_at?: string | null
          seller_id: string
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          buyer_address?: string | null
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          items?: Json
          lead_id?: string | null
          notes?: string | null
          paid_at?: string | null
          seller_id?: string
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_invoices_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "seller_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_leads: {
        Row: {
          account_id: string | null
          assigned_to: string | null
          buyer_company: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_location: string | null
          buyer_name: string | null
          buyer_phone: string | null
          contact_designation: string | null
          contact_person_name: string | null
          converted_to_opportunity: boolean | null
          created_at: string
          currency: string | null
          expected_close_date: string | null
          expected_value: number | null
          id: string
          industry_type: string | null
          is_unlocked: boolean | null
          item_id: string | null
          item_name: string | null
          item_type: string
          last_contacted_at: string | null
          lead_score: number | null
          lead_source: string | null
          lead_type: string | null
          lost_reason: string | null
          next_follow_up: string | null
          notes: string | null
          opportunity_id: string | null
          priority: string | null
          product_category: string | null
          qualification_score: number | null
          seller_id: string
          source: string | null
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assigned_to?: string | null
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_location?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          contact_designation?: string | null
          contact_person_name?: string | null
          converted_to_opportunity?: boolean | null
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          expected_value?: number | null
          id?: string
          industry_type?: string | null
          is_unlocked?: boolean | null
          item_id?: string | null
          item_name?: string | null
          item_type?: string
          last_contacted_at?: string | null
          lead_score?: number | null
          lead_source?: string | null
          lead_type?: string | null
          lost_reason?: string | null
          next_follow_up?: string | null
          notes?: string | null
          opportunity_id?: string | null
          priority?: string | null
          product_category?: string | null
          qualification_score?: number | null
          seller_id: string
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assigned_to?: string | null
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_location?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          contact_designation?: string | null
          contact_person_name?: string | null
          converted_to_opportunity?: boolean | null
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          expected_value?: number | null
          id?: string
          industry_type?: string | null
          is_unlocked?: boolean | null
          item_id?: string | null
          item_name?: string | null
          item_type?: string
          last_contacted_at?: string | null
          lead_score?: number | null
          lead_source?: string | null
          lead_type?: string | null
          lost_reason?: string | null
          next_follow_up?: string | null
          notes?: string | null
          opportunity_id?: string | null
          priority?: string | null
          product_category?: string | null
          qualification_score?: number | null
          seller_id?: string
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_leads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          request_id: string | null
          seller_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          notification_type?: string
          request_id?: string | null
          seller_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          request_id?: string | null
          seller_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "user_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_appointments: {
        Row: {
          appointment_date: string
          client_id: string | null
          created_at: string | null
          duration_hours: number | null
          id: string
          location: string | null
          notes: string | null
          provider_id: string | null
          service_request_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          client_id?: string | null
          created_at?: string | null
          duration_hours?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          provider_id?: string | null
          service_request_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          client_id?: string | null
          created_at?: string | null
          duration_hours?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          provider_id?: string | null
          service_request_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_appointments_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          budget_range: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          completion_date: string | null
          created_at: string | null
          description: string
          id: string
          location: string
          provider_id: string | null
          request_id: string
          scheduled_date: string | null
          service_id: string | null
          service_type: string
          special_requirements: string | null
          status: string | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          budget_range?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          completion_date?: string | null
          created_at?: string | null
          description: string
          id?: string
          location: string
          provider_id?: string | null
          request_id?: string
          scheduled_date?: string | null
          service_id?: string | null
          service_type: string
          special_requirements?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          budget_range?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string
          id?: string
          location?: string
          provider_id?: string | null
          request_id?: string
          scheduled_date?: string | null
          service_id?: string | null
          service_type?: string
          special_requirements?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          client_id: string | null
          communication_rating: number | null
          created_at: string | null
          id: string
          provider_id: string | null
          quality_rating: number | null
          rating: number | null
          response_time_rating: number | null
          review_text: string | null
          service_request_id: string | null
        }
        Insert: {
          client_id?: string | null
          communication_rating?: number | null
          created_at?: string | null
          id?: string
          provider_id?: string | null
          quality_rating?: number | null
          rating?: number | null
          response_time_rating?: number | null
          review_text?: string | null
          service_request_id?: string | null
        }
        Update: {
          client_id?: string | null
          communication_rating?: number | null
          created_at?: string | null
          id?: string
          provider_id?: string | null
          quality_rating?: number | null
          rating?: number | null
          response_time_rating?: number | null
          review_text?: string | null
          service_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_reviews_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          completed_jobs: number | null
          coverage: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          name: string
          price_range: string | null
          provider_id: string
          rating: number | null
          service_type: string
          specializations: string[] | null
          updated_at: string
        }
        Insert: {
          completed_jobs?: number | null
          coverage?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          price_range?: string | null
          provider_id: string
          rating?: number | null
          service_type: string
          specializations?: string[] | null
          updated_at?: string
        }
        Update: {
          completed_jobs?: number | null
          coverage?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          price_range?: string | null
          provider_id?: string
          rating?: number | null
          service_type?: string
          specializations?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      skill_tags: {
        Row: {
          category: string
          created_at: string
          icon: string | null
          id: string
          skill_name: string
          sort_order: number | null
        }
        Insert: {
          category: string
          created_at?: string
          icon?: string | null
          id?: string
          skill_name: string
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          icon?: string | null
          id?: string
          skill_name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      spare_parts: {
        Row: {
          brand: string | null
          category: string | null
          category_tags: string[] | null
          compatible_robots: string[] | null
          component_type: string | null
          condition: string | null
          created_at: string
          currency: string | null
          custom_category: string | null
          description: string | null
          duty_amount: number | null
          id: string
          images: string[] | null
          is_international: boolean | null
          location: string | null
          main_category: string | null
          model: string | null
          name: string
          part_number: string | null
          pincode: string | null
          price: number | null
          quantity: number
          seller_id: string
          shipping_amount: number | null
          specifications: Json | null
          state: string | null
          sub_category: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          category_tags?: string[] | null
          compatible_robots?: string[] | null
          component_type?: string | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          custom_category?: string | null
          description?: string | null
          duty_amount?: number | null
          id?: string
          images?: string[] | null
          is_international?: boolean | null
          location?: string | null
          main_category?: string | null
          model?: string | null
          name: string
          part_number?: string | null
          pincode?: string | null
          price?: number | null
          quantity?: number
          seller_id: string
          shipping_amount?: number | null
          specifications?: Json | null
          state?: string | null
          sub_category?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          category_tags?: string[] | null
          compatible_robots?: string[] | null
          component_type?: string | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          custom_category?: string | null
          description?: string | null
          duty_amount?: number | null
          id?: string
          images?: string[] | null
          is_international?: boolean | null
          location?: string | null
          main_category?: string | null
          model?: string | null
          name?: string
          part_number?: string | null
          pincode?: string | null
          price?: number | null
          quantity?: number
          seller_id?: string
          shipping_amount?: number | null
          specifications?: Json | null
          state?: string | null
          sub_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spare_parts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      states: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          annual_price: number | null
          created_at: string
          features: Json | null
          has_advanced_analytics: boolean | null
          has_lead_manager_access: boolean | null
          id: string
          is_active: boolean | null
          monthly_credits: number
          monthly_price: number
          plan_name: string
          plan_type: string
          razorpay_plan_id: string | null
          robot_limit: number | null
          service_limit: number | null
          spare_part_limit: number | null
          support_level: string | null
          updated_at: string
        }
        Insert: {
          annual_price?: number | null
          created_at?: string
          features?: Json | null
          has_advanced_analytics?: boolean | null
          has_lead_manager_access?: boolean | null
          id?: string
          is_active?: boolean | null
          monthly_credits?: number
          monthly_price?: number
          plan_name: string
          plan_type: string
          razorpay_plan_id?: string | null
          robot_limit?: number | null
          service_limit?: number | null
          spare_part_limit?: number | null
          support_level?: string | null
          updated_at?: string
        }
        Update: {
          annual_price?: number | null
          created_at?: string
          features?: Json | null
          has_advanced_analytics?: boolean | null
          has_lead_manager_access?: boolean | null
          id?: string
          is_active?: boolean | null
          monthly_credits?: number
          monthly_price?: number
          plan_name?: string
          plan_type?: string
          razorpay_plan_id?: string | null
          robot_limit?: number | null
          service_limit?: number | null
          spare_part_limit?: number | null
          support_level?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: string | null
          cancelled_at: string | null
          created_at: string
          currency: string
          end_date: string | null
          id: string
          next_billing_date: string | null
          plan_id: string | null
          plan_name: string
          razorpay_customer_id: string | null
          razorpay_subscription_id: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          next_billing_date?: string | null
          plan_id?: string | null
          plan_name?: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          next_billing_date?: string | null
          plan_id?: string | null
          plan_name?: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string | null
          created_at: string
          description: string
          id: string
          priority: string
          status: string
          subject: string
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string
          status?: string
          subject: string
          ticket_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      talent_jobs: {
        Row: {
          application_count: number | null
          category: string
          city: string | null
          company_type: string | null
          created_at: string
          description: string | null
          employer_id: string
          experience_max: number | null
          experience_min: number | null
          id: string
          is_featured: boolean | null
          job_type: string | null
          location: string | null
          robot_brand: string | null
          salary_max: number | null
          salary_min: number | null
          skills_required: string[] | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          application_count?: number | null
          category: string
          city?: string | null
          company_type?: string | null
          created_at?: string
          description?: string | null
          employer_id: string
          experience_max?: number | null
          experience_min?: number | null
          id?: string
          is_featured?: boolean | null
          job_type?: string | null
          location?: string | null
          robot_brand?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills_required?: string[] | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          application_count?: number | null
          category?: string
          city?: string | null
          company_type?: string | null
          created_at?: string
          description?: string | null
          employer_id?: string
          experience_max?: number | null
          experience_min?: number | null
          id?: string
          is_featured?: boolean | null
          job_type?: string | null
          location?: string | null
          robot_brand?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills_required?: string[] | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_inquiries: {
        Row: {
          created_at: string
          id: string
          message: string | null
          program_id: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          program_id: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          program_id?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_inquiries_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          certification: string | null
          city: string | null
          course_name: string
          created_at: string
          description: string | null
          duration: string | null
          fees: number | null
          id: string
          is_featured: boolean | null
          location: string | null
          max_students: number | null
          mode: string | null
          robot_brand: string | null
          skill_category: string | null
          skills_covered: string[] | null
          status: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          certification?: string | null
          city?: string | null
          course_name: string
          created_at?: string
          description?: string | null
          duration?: string | null
          fees?: number | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          max_students?: number | null
          mode?: string | null
          robot_brand?: string | null
          skill_category?: string | null
          skills_covered?: string[] | null
          status?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          certification?: string | null
          city?: string | null
          course_name?: string
          created_at?: string
          description?: string | null
          duration?: string | null
          fees?: number | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          max_students?: number | null
          mode?: string | null
          robot_brand?: string | null
          skill_category?: string | null
          skills_covered?: string[] | null
          status?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      unlocked_contacts: {
        Row: {
          credits_used: number
          id: string
          item_id: string
          item_type: string
          seller_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          credits_used?: number
          id?: string
          item_id: string
          item_type: string
          seller_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          credits_used?: number
          id?: string
          item_id?: string
          item_type?: string
          seller_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      unlocked_leads: {
        Row: {
          credits_used: number
          id: string
          lead_id: string
          seller_id: string
          unlocked_at: string
        }
        Insert: {
          credits_used: number
          id?: string
          lead_id: string
          seller_id: string
          unlocked_at?: string
        }
        Update: {
          credits_used?: number
          id?: string
          lead_id?: string
          seller_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unlocked_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "seller_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_product_requests: {
        Row: {
          admin_notes: string | null
          brand: string | null
          budget: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          location: string | null
          product_name: string
          product_type: string
          quantity: number | null
          specifications: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          brand?: string | null
          budget?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          location?: string | null
          product_name: string
          product_type: string
          quantity?: number | null
          specifications?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          brand?: string | null
          budget?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          location?: string | null
          product_name?: string
          product_type?: string
          quantity?: number | null
          specifications?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_requests: {
        Row: {
          additional_data: Json | null
          company_name: string | null
          created_at: string
          email_address: string
          id: string
          item_id: string | null
          item_name: string | null
          item_type: string
          location: string | null
          mobile_number: string | null
          request_type: string
          requirements: string | null
          seller_id: string
          status: string | null
          updated_at: string
          urgency: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          additional_data?: Json | null
          company_name?: string | null
          created_at?: string
          email_address: string
          id?: string
          item_id?: string | null
          item_name?: string | null
          item_type: string
          location?: string | null
          mobile_number?: string | null
          request_type: string
          requirements?: string | null
          seller_id: string
          status?: string | null
          updated_at?: string
          urgency?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          additional_data?: Json | null
          company_name?: string | null
          created_at?: string
          email_address?: string
          id?: string
          item_id?: string | null
          item_name?: string | null
          item_type?: string
          location?: string | null
          mobile_number?: string | null
          request_type?: string
          requirements?: string | null
          seller_id?: string
          status?: string | null
          updated_at?: string
          urgency?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      watchlists: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          notes: string | null
          priority: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          notes?: string | null
          priority?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          notes?: string | null
          priority?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calc_reading_time: { Args: { _content: string }; Returns: number }
      complete_user_profile:
        | {
            Args: {
              p_account_type?: string
              p_company_name?: string
              p_email: string
              p_finance_type?: string[]
              p_financing_for?: string[]
              p_full_name?: string
              p_government_scheme_support?: boolean
              p_location?: string
              p_logistics_region?: string
              p_logistics_type?: string
              p_mobile_number?: string
              p_seller_roles?: string[]
              p_target_audience?: string[]
              p_transport_modes?: string[]
              p_user_id: string
              p_user_type?: string
              p_warehouse_storage?: boolean
            }
            Returns: {
              account_type: string
              company_name: string
              created_at: string
              email: string
              full_name: string
              location: string
              mobile_number: string
              profile_id: string
              registration_complete: boolean
              updated_at: string
              user_id: string
              user_roles: string[]
            }[]
          }
        | {
            Args: {
              p_account_type?: string
              p_city?: string
              p_company_name?: string
              p_email: string
              p_finance_type?: string[]
              p_financing_for?: string[]
              p_full_address?: string
              p_full_name?: string
              p_government_scheme_support?: boolean
              p_location?: string
              p_logistics_region?: string
              p_logistics_type?: string
              p_mobile_number?: string
              p_seller_roles?: string[]
              p_target_audience?: string[]
              p_transport_modes?: string[]
              p_user_id: string
              p_user_type?: string
              p_warehouse_storage?: boolean
            }
            Returns: {
              account_type: string
              company_name: string
              created_at: string
              email: string
              full_name: string
              location: string
              mobile_number: string
              profile_id: string
              registration_complete: boolean
              updated_at: string
              user_id: string
              user_roles: string[]
            }[]
          }
        | {
            Args: {
              p_account_type?: string
              p_city?: string
              p_company_name?: string
              p_email: string
              p_finance_type?: string[]
              p_financing_for?: string[]
              p_full_address?: string
              p_full_name?: string
              p_government_scheme_support?: boolean
              p_location?: string
              p_logistics_region?: string
              p_logistics_type?: string
              p_mobile_number?: string
              p_pincode?: string
              p_seller_roles?: string[]
              p_target_audience?: string[]
              p_transport_modes?: string[]
              p_user_id: string
              p_user_type?: string
              p_warehouse_storage?: boolean
            }
            Returns: {
              account_type: string
              company_name: string
              created_at: string
              email: string
              full_name: string
              location: string
              mobile_number: string
              profile_id: string
              registration_complete: boolean
              updated_at: string
              user_id: string
              user_roles: string[]
            }[]
          }
      convert_quote_to_lead: {
        Args: { p_request_id: string; p_seller_id: string }
        Returns: string
      }
      convert_view_to_lead: {
        Args: { p_seller_id: string; p_view_id: string }
        Returns: string
      }
      create_complete_user_profile: {
        Args: {
          p_account_type?: string
          p_company_name?: string
          p_email: string
          p_finance_type?: string[]
          p_financing_for?: string[]
          p_full_name?: string
          p_government_scheme_support?: boolean
          p_location?: string
          p_logistics_region?: string
          p_logistics_type?: string
          p_mobile_number?: string
          p_seller_roles?: string[]
          p_target_audience?: string[]
          p_transport_modes?: string[]
          p_user_id: string
          p_user_type?: string
          p_warehouse_storage?: boolean
        }
        Returns: string
      }
      create_user_profile: {
        Args: {
          p_account_type?: string
          p_company_name?: string
          p_email: string
          p_full_name?: string
          p_location?: string
          p_mobile_number?: string
          p_user_id: string
          p_user_type?: string
        }
        Returns: string
      }
      filter_contact_info: { Args: { message: string }; Returns: boolean }
      generate_random_string: { Args: { length: number }; Returns: string }
      generate_unique_blog_slug: {
        Args: { _id: string; _title: string }
        Returns: string
      }
      get_buyer_info: {
        Args: {
          p_buyer_name: string
          p_company_name: string
          p_email: string
          p_inquiry_id: string
          p_mobile_number: string
          p_seller_id: string
        }
        Returns: {
          buyer_name: string
          company_name: string
          email: string
          has_access: boolean
          mobile_number: string
        }[]
      }
      get_chat_conversations_with_users: {
        Args: never
        Returns: {
          created_at: string
          item_id: string
          item_name: string
          item_type: string
          last_message_at: string
          message_count: number
          session_id: string
          status: string
          user1_email: string
          user1_id: string
          user1_name: string
          user2_email: string
          user2_id: string
          user2_name: string
        }[]
      }
      get_chat_messages_for_session: {
        Args: { p_session_id: string }
        Returns: {
          blocked_reason: string
          created_at: string
          is_blocked: boolean
          is_read: boolean
          message_content: string
          message_id: string
          sender_email: string
          sender_id: string
          sender_name: string
        }[]
      }
      get_item_view_count: {
        Args: { p_item_id: string; p_item_type: string }
        Returns: number
      }
      get_logistics_data: {
        Args: { provider_id: string; table_name: string }
        Returns: Json
      }
      get_provider_business_info: {
        Args: { provider_user_id: string }
        Returns: {
          account_type: string
          company_name: string
          full_name: string
          location: string
          registration_complete: boolean
          service_categories: string[]
          user_id: string
          user_roles: string[]
          user_type: string
        }[]
      }
      get_provider_public_info: {
        Args: { provider_user_id: string }
        Returns: {
          account_type: string
          company_name: string
          full_name: string
          location: string
          registration_complete: boolean
          service_categories: string[]
          user_id: string
          user_roles: string[]
          user_type: string
        }[]
      }
      get_public_profile_count: { Args: never; Returns: number }
      get_public_provider_profile: {
        Args: { provider_user_id: string }
        Returns: {
          account_type: string
          company_name: string
          full_name: string
          location: string
          registration_complete: boolean
          service_categories: string[]
          user_id: string
          user_roles: string[]
          user_type: string
        }[]
      }
      get_robot_view_count: { Args: { p_robot_id: string }; Returns: number }
      get_total_profiles_count: { Args: never; Returns: number }
      get_unread_conversations: {
        Args: { p_user_id: string }
        Returns: {
          conversation_partner_email: string
          conversation_partner_id: string
          conversation_partner_name: string
          item_id: string
          item_name: string
          item_type: string
          last_message_at: string
          last_message_content: string
          session_id: string
          unread_count: number
        }[]
      }
      get_unread_message_count: { Args: { p_user_id: string }; Returns: number }
      get_user_watchlist_count: { Args: { p_user_id: string }; Returns: number }
      has_buyer_access: {
        Args: { p_inquiry_id: string; p_seller_id: string }
        Returns: boolean
      }
      increment_blog_view_count: {
        Args: { p_blog_id: string }
        Returns: number
      }
      increment_community_post_view_count: {
        Args: { p_post_id: string }
        Returns: number
      }
      increment_item_view_count: {
        Args: { p_item_id: string; p_item_type: string }
        Returns: number
      }
      increment_robot_view_count: {
        Args: { p_robot_id: string }
        Returns: number
      }
      increment_seller_sales: {
        Args: { p_seller_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_item_in_watchlist: {
        Args: { p_item_id: string; p_item_type: string; p_user_id: string }
        Returns: boolean
      }
      place_auction_bid: {
        Args: {
          p_auction_id: string
          p_bid_amount: number
          p_bidder_id: string
        }
        Returns: Json
      }
      slugify: { Args: { input: string }; Returns: string }
      unlock_buyer_with_credits: {
        Args: { p_item_type: string; p_lead_id: string; p_seller_id: string }
        Returns: boolean
      }
      unlock_contact_with_credits: {
        Args: {
          p_item_id: string
          p_item_name?: string
          p_item_type: string
          p_seller_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      auction_status: "upcoming" | "live" | "ended" | "sold" | "not_sold"
      auction_type: "open" | "sealed"
      lead_source_type:
        | "website"
        | "inquiry"
        | "referral"
        | "exhibition"
        | "partner"
        | "direct"
        | "chat"
        | "phone"
        | "email"
        | "other"
      lead_type:
        | "robot"
        | "spare_parts"
        | "tools"
        | "services"
        | "software"
        | "logistics"
        | "finance"
        | "other"
      opportunity_stage:
        | "qualification"
        | "needs_analysis"
        | "proposal"
        | "negotiation"
        | "closed_won"
        | "closed_lost"
      seller_role_enum: "robot_seller" | "parts_seller" | "service_provider"
      user_type_enum:
        | "buyer"
        | "robot_seller"
        | "parts_seller"
        | "service_provider"
        | "logistics_provider"
        | "finance_provider"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      auction_status: ["upcoming", "live", "ended", "sold", "not_sold"],
      auction_type: ["open", "sealed"],
      lead_source_type: [
        "website",
        "inquiry",
        "referral",
        "exhibition",
        "partner",
        "direct",
        "chat",
        "phone",
        "email",
        "other",
      ],
      lead_type: [
        "robot",
        "spare_parts",
        "tools",
        "services",
        "software",
        "logistics",
        "finance",
        "other",
      ],
      opportunity_stage: [
        "qualification",
        "needs_analysis",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
      ],
      seller_role_enum: ["robot_seller", "parts_seller", "service_provider"],
      user_type_enum: [
        "buyer",
        "robot_seller",
        "parts_seller",
        "service_provider",
        "logistics_provider",
        "finance_provider",
      ],
    },
  },
} as const
