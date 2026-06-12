--
-- PostgreSQL database dump
--

\restrict 4sUFcHqgrFLx64JEajl4IEuqFm0CdseaLEwsy3tIEUibNAbyh9Vlhhd4ytle5vg

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE IF EXISTS scholastica_finance;
--
-- Name: scholastica_finance; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE scholastica_finance WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'English_Tanzania.1252';


ALTER DATABASE scholastica_finance OWNER TO postgres;

\unrestrict 4sUFcHqgrFLx64JEajl4IEuqFm0CdseaLEwsy3tIEUibNAbyh9Vlhhd4ytle5vg
\connect scholastica_finance
\restrict 4sUFcHqgrFLx64JEajl4IEuqFm0CdseaLEwsy3tIEUibNAbyh9Vlhhd4ytle5vg

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    full_name character varying(150) NOT NULL,
    phone_number character varying(20) NOT NULL,
    email character varying(100),
    address text,
    status character varying(20) DEFAULT 'active'::character varying,
    registration_date date DEFAULT CURRENT_DATE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: loans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loans (
    id integer NOT NULL,
    client_id integer NOT NULL,
    client_name character varying(150) NOT NULL,
    phone_number character varying(20),
    amount_borrowed numeric(12,2) NOT NULL,
    interest_rate numeric(5,2) NOT NULL,
    interest_amount numeric(12,2) NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    amount_repaid numeric(12,2) DEFAULT 0,
    remaining_balance numeric(12,2) GENERATED ALWAYS AS ((total_amount - amount_repaid)) STORED,
    duration_months integer DEFAULT 1,
    start_date date NOT NULL,
    due_date date NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT loans_amount_borrowed_check CHECK ((amount_borrowed > (0)::numeric))
);


ALTER TABLE public.loans OWNER TO postgres;

--
-- Name: loans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.loans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loans_id_seq OWNER TO postgres;

--
-- Name: loans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.loans_id_seq OWNED BY public.loans.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    loan_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_date date NOT NULL,
    receipt_number character varying(50),
    payment_method character varying(50) DEFAULT 'cash'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(150) NOT NULL,
    role character varying(50) DEFAULT 'staff'::character varying,
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: loans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans ALTER COLUMN id SET DEFAULT nextval('public.loans_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, full_name, phone_number, email, address, status, registration_date, created_at, updated_at) FROM stdin;
1	Mayunga Magengati Malaba	255763387403	malabamalaba26@gmail.com	mwankinga	active	2026-06-03	2026-06-03 11:49:08.478834	2026-06-03 11:49:08.478834
2	Ester Dende Kitilu	255693824815	simonesta84@gmail.com	P.o.box 28	active	2026-06-03	2026-06-03 11:59:13.040349	2026-06-03 11:59:13.040349
4	Malaba Malaba	255763387404	malabamalaba26@gmail.com	NYARUTUNTU\nKARAGWE, KAGERA	active	2026-06-03	2026-06-03 12:14:16.397381	2026-06-03 12:14:16.397381
6	Mayunga Magengati Malaba	255763387409	malabamalaba26@gmail.com	mwankinga	active	2026-06-03	2026-06-03 12:25:08.653041	2026-06-03 12:25:08.653041
7	Mayunga Magengati Malaba	255763387411	malabamalaba26@gmail.com	mwankinga	active	2026-06-03	2026-06-03 12:29:07.833665	2026-06-03 12:29:07.833665
\.


--
-- Data for Name: loans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loans (id, client_id, client_name, phone_number, amount_borrowed, interest_rate, interest_amount, total_amount, amount_repaid, duration_months, start_date, due_date, status, notes, created_at, updated_at) FROM stdin;
2	2	Ester Dende Kitilu	255693824815	50000.00	10.00	5000.00	55000.00	50000.00	1	2026-06-03	2026-06-03	active	\N	2026-06-03 11:59:53.678997	2026-06-03 12:00:38.640138
3	4	Malaba Malaba	255763387404	400000.00	10.00	80000.00	480000.00	0.00	2	2026-06-03	2026-08-06	active	\N	2026-06-03 12:14:59.98868	2026-06-03 12:14:59.98868
1	1	Mayunga Magengati Malaba	255763387403	50000.00	10.00	5000.00	55000.00	54000.00	1	2026-06-03	2026-06-03	active	\N	2026-06-03 11:49:45.943719	2026-06-03 12:16:23.231891
4	7	Mayunga Magengati Malaba	255763387411	700000.00	10.00	140000.00	840000.00	600000.00	2	2026-06-03	2026-06-06	active	\N	2026-06-03 12:29:36.821077	2026-06-03 12:30:28.896
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, loan_id, amount, payment_date, receipt_number, payment_method, notes, created_at) FROM stdin;
1	1	50000.00	2026-06-04	RCP1780476619012	cash	\N	2026-06-03 11:50:19.010827
2	2	50000.00	2026-06-03	RCP1780477238641	cash	\N	2026-06-03 12:00:38.640138
3	1	4000.00	2027-07-31	RCP1780478183241	cash	\N	2026-06-03 12:16:23.231891
4	4	600000.00	2026-06-04	RCP1780479028926	cash	\N	2026-06-03 12:30:28.896
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, full_name, role, is_active, last_login, created_at) FROM stdin;
1	admin	admin@scholastica.com	$2b$10$YourHashWillBeGeneratedByBackend	System Administrator	admin	t	\N	2026-06-03 11:46:10.512351
\.


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clients_id_seq', 7, true);


--
-- Name: loans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loans_id_seq', 4, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 4, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: clients clients_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_phone_number_key UNIQUE (phone_number);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: loans loans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_receipt_number_key UNIQUE (receipt_number);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_loans_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loans_client ON public.loans USING btree (client_id);


--
-- Name: idx_loans_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loans_due_date ON public.loans USING btree (due_date);


--
-- Name: idx_loans_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loans_status ON public.loans USING btree (status);


--
-- Name: idx_payments_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_date ON public.payments USING btree (payment_date);


--
-- Name: idx_payments_loan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_loan ON public.payments USING btree (loan_id);


--
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: loans update_loans_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: loans loans_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: payments payments_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON DELETE CASCADE;


--
-- Name: DATABASE scholastica_finance; Type: ACL; Schema: -; Owner: postgres
--

GRANT ALL ON DATABASE scholastica_finance TO scholastica_admin;


--
-- PostgreSQL database dump complete
--

\unrestrict 4sUFcHqgrFLx64JEajl4IEuqFm0CdseaLEwsy3tIEUibNAbyh9Vlhhd4ytle5vg

