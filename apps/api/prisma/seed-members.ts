import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Sample members data ──
// Format: [Nama, NRA, Tempat Tgl Lahir, Tempat - Tahun Dadar, Ranting, Foto, Tingkatan]
const membersData: [string, string, string, string, string, string, string][] = [
  ['F. X. Agus Susilo', '0114-001-1993', 'Ambarawa, 05 Juni 1958', 'Larantuka - 1993', 'Sta. Maria Ratu Semesta Alam Hokeng', 'F. X. Agus Susilo.png', 'Tamtama'],
  ['Yoseph Kewaro Huler', '0114-002-1995', 'Kloreama, 09 Juni 1953', 'Hokeng - 1995', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yoseph Kewaro Huler.png', 'Tamtama'],
  ['Piet Wolor', '0114-003-1995', 'Kupang, 02 April 1972', 'Hokeng - 1995', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Piet Wolor.png', 'Tamtama'],
  ['Mateus Nikut Boruk', '0114-004-1995', 'Boru, 24 Januari 1979', 'Hokeng - 1995', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Mateus Nikut Boruk.png', 'Tamtama'],
  ['Rosa Dalima Mora', '0114-005-1998', 'Duang, 01 Oktober 1959', 'Hokeng - 1998', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Rosa Dalima Mora.png', 'Tamtama'],
  ['Fransiskus X. Adi Koten', '0114-006-2017', 'Riangkotek, 04 Oktober 1994', 'Lela - 2017', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Fransiskus  X. Adi Koten.png', 'Tamtama'],
  ['Aloysius Lodovikus Lengari', '0114-007-2013', 'Larantuka, 30 Mei 2001', 'Emaus Weri - 2013', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Aloysius Lodovikus Lengari.png', 'Tamtama'],
  ['Norbertus Wempy Junior Keraf', '0114-008-2016', 'Tanjung Pinang, 16 Juni 2002', 'Batam - 2016', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Norbertus Wempy Junior Keraf.png', 'Tamtama'],
  ['Simon Petrus Ivon Seran', '0114-009-2019', 'Pantai Oa, 20 Mei 2002', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Simon Petrus Ivon Seran.png', 'Tamtama'],
  ['Alfonz Michael Lamatokan', '0114-010-2016', 'Lewoleba, 14 Oktober 2002', 'Waikomo - 2016', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Alfonz Michael Lamatokan.png', 'Tamtama'],
  ['Yosep M. Payong', '0114-011-2016', 'Hokeng, 04 Mei 2003', 'Hokeng - 2016', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yosep M. Payong.png', 'Tamtama'],
  ['Benyamin C. Meo', '0114-012-2016', 'Maumere, 20 April 2002', 'Hokeng - 2016', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Benyamin C. Meo.png', 'Tamtama'],
  ['Anselmus Ola Herin', '0114-013-2019', 'Lamaleka, 22 November 1999', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Anselmus Ola Herin.png', 'Tamtama'],
  ['Perpetua Yulista Alexandra Wolor', '0114-014-2016', 'Maumere, 25 Juli 2005', 'Hokeng - 2016', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Perpetua Yulista Alexandra Wolor.png', 'Tamtama'],
  ['Laurensius D. Boruk', '0114-015-2016', 'Hokeng, 14 Januari 1999', 'Hokeng - 2016', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Laurensius D. Boruk.png', 'Tamtama'],
  ['Krisantus Aderai Boruk', '0114-016-2016', 'Hokeng, 25 Oktober 2003', 'Hokeng - 2016', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Krisantus Aderai Boruk.png', 'Tamtama'],
  ['Maria Bernadelis W. Puka', '0114-017-2016', 'Boru, 12 April 2005', 'Hokeng - 2016', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Maria Bernadelis W. Puka.png', 'Tamtama'],
  ['Yoanna Du\'a Sareng', '0114-018-2016', 'Hokeng, 13 April 2005', 'Hokeng - 2016', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yoanna Du\'a Sareng.png', 'Tamtama'],
  ['Elisabeth Mawarani', '0114-019-2019', 'Malaysia, 03 Maret 2004', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Elisabeth Mawarani.png', 'Tamtama'],
  ['Kristina Wenu Plue', '0114-020-2019', 'Larantuka, 12 September 2004', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Kristina Wenu Plue.png', 'Tamtama'],
  ['Germana Desi Rani Pegan', '0114-021-2019', 'Boru, 01 Desember 2003', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Germana Desi Rani Pegan.png', 'Tamtama'],
  ['Indrianti Anjelina Hikon', '0114-022-2019', 'Malaysia, 22 Juli 2005', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Indrianti Anjelina Hikon.png', 'Tamtama'],
  ['Salfiana Boy Bana', '0114-023-2019', 'Boru, 14 September 2003', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Salfiana Boy Bana.png', 'Tamtama'],
  ['Andreas Simeon Witin', '0114-024-2019', 'Lamawolo, 09 September 2003', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Andreas Simeon Witin.png', 'Tamtama'],
  ['Redemptus Lue Roma', '0114-025-2019', 'Maumere, 08 April 2000', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Redemptus Lue Roma.png', 'Tamtama'],
  ['Anselmus Kewa Ama Blikololong', '0114-026-2019', 'Wolowaru, 21 April 2002', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Anselmus Kewa Ama Blikololong.png', 'Tamtama'],
  ['Philipus Rinaldi Jere Boruk', '0114-027-2019', 'Boru, 05 Desember 2008', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Philipus Rinaldi Jere Boruk.png', 'Tamtama'],
  ['Germanus Sinu Beding', '0114-028-2019', 'Olafulihaa, 29 Mei 2001', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Germanus Sinu Beding.png', 'Tamtama'],
  ['Adrian Doni Beda', '0114-029-2019', 'Malaysia, 08 Juli 2007', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Adrian Doni Beda.png', 'Tamtama'],
  ['Vitus Ronaldino Plate Koban', '0114-030-2019', 'Lewoleba, 15 Juni 2002', 'Hokeng - 2019', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Vitus Ronaldino Plate Koban.png', 'Tamtama'],
  ['Arnoldus Janssen Ledo', '0114-031-2020', 'Lewoleba, 07 Maret 2004', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Arnoldus Janssen Ledo.png', 'Tamtama'],
  ['Gabriel Felistian Warat Leton', '0114-032-2020', 'Larantuka, 15 Juni 2002', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Gabriel Felistian Warat Leton.png', 'Tamtama'],
  ['Harwai Sandi Soge Duan', '0114-033-2020', 'Lewoleba, 17 Juni 2004', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Harwai Sandi Soge Duan.png', 'Tamtama'],
  ['Ignatius Lawe Kemaun', '0114-034-2020', 'Lewokung, 16 Desember 2002', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Ignatius Lawe Kemaun.png', 'Tamtama'],
  ['Jovales B. Tara', '0114-035-2020', 'Kaimana, 28 Desember 2004', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Jovales B. Tara.png', 'Tamtama'],
  ['Laurensius L. Hayon', '0114-036-2020', 'Lamalewo, 12 Juli 2002', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Laurensius L. Hayon.png', 'Tamtama'],
  ['Laurentius S. P. P. Kuroumang', '0114-037-2020', 'Ruteng, 05 September 2002', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Laurentius S. P. P. Kuroumang.png', 'Tamtama'],
  ['Leonardus Nama Bailamen', '0114-038-2020', 'Lite, 26 November 2001', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Leonardus Nama Bailamen.png', 'Tamtama'],
  ['Marselino Lewulelek', '0114-039-2020', 'Lambunga, 27 Agustus 2003', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Marselino Lewulelek.png', 'Tamtama'],
  ['Matius Miteng', '0114-040-2020', 'Malaysia, 15 September 2002', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Matius Miteng.png', 'Tamtama'],
  ['Nasarius Ola Sanga', '0114-041-2020', 'Lembata, 16 Juni 2004', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Nasarius Ola Sanga.png', 'Tamtama'],
  ['Paulus Albert Edward Junior', '0114-042-2020', 'Kupang, 13 Juni 2002', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Paulus Albert Edward Junior.png', 'Tamtama'],
  ['Paulus Wata D. Bagur', '0114-043-2020', 'Lewoleba, 26 November 2003', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Paulus Wata D. Bagur.png', 'Tamtama'],
  ['Petrus Beda Bataona', '0114-044-2020', 'Lamalera, 29 Juni 2003', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Petrus Beda Bataona.png', 'Tamtama'],
  ['Petrus Yosua A. P. Luon', '0114-045-2020', 'Lewoleba, 29 April 2003', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Petrus Yosua A. P. Luon.png', 'Tamtama'],
  ['Stanislaus G. Tapoona', '0114-046-2020', 'Lamalera, 13 November 2001', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Stanislaus G. Tapoona.png', 'Tamtama'],
  ['Vinsensius Atulolon', '0114-047-2020', 'Hadakewa, 22 Januari 2004', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Vinsensius Atulolon.png', 'Tamtama'],
  ['Yakobus Don Tain Pin', '0114-048-2020', 'Kimakamak, 14 April 2002', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yakobus Don Tain Pin.png', 'Tamtama'],
  ['Yohanes G. C. P. Pani', '0114-049-2020', 'Kupang, 12 Januari 2003', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yohanes G. C. P. Pani.png', 'Tamtama'],
  ['Yohanes Marianus Ama Witak', '0114-050-2020', 'Lamalu\'o, 20 Maret 2002', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yohanes Marianus Ama Witak.png', 'Tamtama'],
  ['Yoseph Doleole P. Weruin', '0114-051-2020', 'Lewolaga, 04 Desember 2001', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yoseph Doleole P. Weruin.png', 'Tamtama'],
  ['Yoseph Freinademetz R. Lein', '0114-052-2020', 'Waibalun, 13 Januari 2004', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yoseph Freinademetz  R. Lein.png', 'Tamtama'],
  ['Yoseph Riyanto Gonsalis Wain', '0114-053-2020', 'Yogyakarta, 08 Maret 2004', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yoseph Riyanto Gonsalis Wain.png', 'Tamtama'],
  ['Magdalena Erlintina Liwu', '0114-054-2020', 'Larantuka, 08 April 2009', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Magdalena Erlintina Liwu.png', 'Tamtama'],
  ['Septiana Yulita Liwu', '0114-055-2020', 'Boru, 21 September 2008', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Septiana Yulita Liwu.png', 'Tamtama'],
  ['Agnes Hoe Amatouk', '0114-056-2020', 'Boru, 16 Februari 2006', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Agnes Hoe Amatouk.png', 'Tamtama'],
  ['Oktavia Ulu Lewar', '0114-057-2020', 'Boru, 28 Oktober 2005', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Oktavia Ulu Lewar.png', 'Tamtama'],
  ['Natalia Ona Hodo', '0114-058-2020', 'Boru, 27 Oktober 2005', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Natalia Ona Hodo.png', 'Tamtama'],
  ['Dominika Hebong Lewar', '0114-059-2020', 'Boru, 07 Mei 2006', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Dominika Hebong Lewar.png', 'Tamtama'],
  ['Estina Burang Lewuk', '0114-060-2020', 'Nunukan, 01 Agustus 2007', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Estina Burang Lewuk.png', 'Tamtama'],
  ['Maria Viktoria Plain Liwu', '0114-061-2020', 'Nunukan, 01 Agustus 2007', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Maria Viktoria Plain Liwu.png', 'Tamtama'],
  ['Andreas Alvelino Raja Sado', '0114-062-2020', 'Boru, 10 Januari 2004', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Andreas Alvelino Raja Sado.png', 'Tamtama'],
  ['Hendrik Radikal', '0114-063-2020', '', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Hendrik Radikal.png', 'Tamtama'],
  ['Vetri Tanto K. S. Mare', '0114-064-2020', 'Tunggal Bumi, 18 Februari 2007', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Vetri Tanto K.  S. Mare.png', 'Tamtama'],
  ['Rohkus Gonsales Gelinuba', '0114-065-2020', 'Waiwerang, 02 November 2006', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Rohkus Gonsales Gelinuba.png', 'Tamtama'],
  ['Wilhelmus Watu Buran', '0114-066-2020', 'Waikomo, 26 Maret 2006', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Wilhelmus Watu Buran.png', 'Tamtama'],
  ['Yufita Dete Keraf', '0114-067-2020', 'Boru, 01 Juni 2006', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yufita Dete Keraf.png', 'Tamtama'],
  ['Maria Veronika Lelang Plue', '0114-068-2020', 'Boru, 07 Mei 2006', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Maria Veronika Lelang Plue.png', 'Tamtama'],
  ['Yosefina Lito Atapukan', '0114-069-2020', 'Lewolaga, 18 Desember 2007', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yosefina Lito Atapukan.png', 'Tamtama'],
  ['Emerensiana Kojang Atapukan', '0114-070-2020', 'Nunukan, 01 Agustus 2007', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Emerensiana Kojang Atapukan.png', 'Tamtama'],
  ['Christian P. M. Gawing Hayon', '0114-071-2020', 'Ritaebang, 04 Januari 2006', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Christian P. M. Gawing Hayon.png', 'Tamtama'],
  ['Yohanes Deluna S. Kebar', '0114-072-2020', 'Ritaebang, 18 Agustus 2007', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yohanes Deluna S. Kebar.png', 'Tamtama'],
  ['Jefry Laga Lewuk', '0114-073-2020', 'Malaysia, 23 Oktober 1999', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Jefry Laga Lewuk.png', 'Tamtama'],
  ['Agnes Oran Atapukan', '0114-074-2020', 'Nunukan, 01 Agustus 2007', 'Hokeng - 2020', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Agnes Oran Atapukan.png', 'Tamtama'],
  ['Alowysius Lamala Manuk', '0114-075-2022', 'Boru, 08 Mei 2006', 'Larantuka - 2022', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Alowysius Lamala Manuk.png', 'Tamtama'],
  ['Theresia Huwok Kayun', '0114-076-2022', '', 'Larantuka - 2022', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Theresia Huwok Kayun.png', 'Tamtama'],
  ['Emiliana Kewa Kewuta', '0114-077-2022', '', 'Larantuka - 2022', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Emiliana Kewa Kewuta.png', 'Tamtama'],
  ['Fransiska Saveria Legur Soge', '0114-078-2022', 'Boru, 03 Desember 2007', 'Larantuka - 2022', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Fransiska Saveria Legur Soge.png', 'Tamtama'],
  ['Maria Fatima Cindry Lamuri', '0114-079-2022', '', 'Larantuka - 2022', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Maria Fatima Cindry Lamuri.png', 'Tamtama'],
  ['Maria Yohana Nini Lewotapo', '0114-080-2022', '', 'Larantuka - 2022', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Maria Yohana Nini Lewotapo.png', 'Tamtama'],
  ['Marselina Rudun', '0114-081-2022', '', 'Larantuka - 2022', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Marselina  Rudun.png', 'Tamtama'],
  ['Nikola Sabina Lein', '0114-082-2022', '', 'Larantuka - 2022', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Nikola Sabina Lein.png', 'Tamtama'],
  ['Monica Chony Making', '0114-083-2022', '', 'Larantuka - 2022', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Monica Chony Making.png', 'Tamtama'],
  ['Yosefa Lungun Lewar', '0114-084-2022', '', 'Larantuka - 2022', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yosefa Lungun Lewar.png', 'Tamtama'],
  ['Yosefine Oktalian Lodan Plue', '0114-085-2022', 'Pokobatun, 22 Oktober 2008', 'Larantuka - 2022', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yosefine Oktalian Lodan Plue.png', 'Tamtama'],
  ['Yosefina Ole Ladjar', '0114-086-2024', 'Tabana, 07 Oktober 2008', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yosefina Ole Ladjar.png', 'Tamtama'],
  ['Raimundus Mulia Mare', '0114-087-2024', 'Nobo, 18 April 2008', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Raimundus Mulia Mare.png', 'Tamtama'],
  ['Philomena Yosefin Daeng Hera', '0114-088-2024', 'Lewolaga, 29 Januari 2010', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Philomena Yosefin Daeng Hera.png', 'Tamtama'],
  ['Pricilya Theresia Pajan Thoby', '0114-089-2024', 'Maumere, 18 Januari 2008', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Pricilya Theresia Pajan Thoby.png', 'Tamtama'],
  ['Claudia Prada Sabaleku', '0114-090-2024', 'Boru, 15 Februari 2011', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Claudia Prada Sabaleku.png', 'Tamtama'],
  ['Maria Gratiani Nogo Tolok', '0114-091-2024', 'Lela, 22 Oktober 2009', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Maria Gratiani Nogo Tolok.png', 'Tamtama'],
  ['Fransiskus Suban Boru', '0114-092-2024', 'Nobo, 30 Mei 2004', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Fransiskus Suban Boru.png', 'Tamtama'],
  ['Maria Alfaresty Liko Namang', '0114-093-2024', 'Maumere, 29 Oktober 2009', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Maria Alfaresty Liko Namang.png', 'Tamtama'],
  ['Silvester Paulus Hajon', '0114-094-2024', 'Kewapante, 31 Desember 2009', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Silvester Paulus Hajon.png', 'Tamtama'],
  ['Paulus ase soge', '0114-095-2024', 'Boru, 09 Oktober 2012', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Paulus ase soge.png', 'Tamtama'],
  ['Yohana Afilia Ona Wolor', '0114-096-2024', 'Watobuku, 11 April 2006', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yohana Afilia Ona Wolor.png', 'Tamtama'],
  ['Maria Orpa Polin', '0114-097-2024', 'Tabana, 26 Agustus 2006', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Maria Orpa Polin.png', 'Tamtama'],
  ['Yosep Rolan Kusindah', '0114-098-2024', 'Larantuka, 18 November 2008', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yosep Rolan Kusindah.png', 'Tamtama'],
  ['Nikolaus Aloisius Yosingka Kerans', '0114-099-2024', 'Maumere, 29 Agustus 2009', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Nikolaus Aloisius Yosingka Kerans .png', 'Tamtama'],
  ['Gregorius Agung Gresituli Deornay', '0114-100-2024', 'Larantuka, 05 September 2010', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Gregorius Agung Gresituli Deornay.png', 'Tamtama'],
  ['Fabianus Lera Neonbanu', '0114-101-2024', 'Kupang, 22 Januari 2009', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Fabianus Lera Neonbanu.png', 'Tamtama'],
  ['Anastasia Keban Kwure', '0114-102-2024', 'Nobo, 07 Februari 2009', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Anastasia Keban Kwure.png', 'Tamtama'],
  ['Yufinti Bogin Rotan', '0114-103-2024', 'Boru, 17 Februari 2008', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Yufinti Bogin Rotan.png', 'Tamtama'],
  ['Bernadete Howok Liwu', '0114-104-2024', 'Boru, 10 Maret 2007', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Bernadete Howok Liwu.png', 'Tamtama'],
  ['Agnes Giovani', '0114-105-2024', 'Boru, 21 Januari 2010', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Agnes Giovani .png', 'Tamtama'],
  ['Maria Rene Watu', '0114-106-2024', 'Larantuka, 12 September 2012', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Maria Rene Watu.png', 'Tamtama'],
  ['Katarina Pai Leba', '0114-107-2024', 'Malang, 13 Januari 2010', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Katarina Pai Leba.png', 'Tamtama'],
  ['Chandra Pareto Tukan', '0114-108-2024', 'Pontianak, 09 Desember 2011', 'Watobuku - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Chandra Pareto Tukan.png', 'Tamtama'],
  ['Lois Demarila Kota Bentu', '0114-109-2024', 'Pontianak, 09 Desember 2011', 'Tanameang - 2024', 'Sta. Maria Ratu Semesta Alam Hokeng', 'Lois Demarila Kota Bentu.png', 'Tamtama'],
];

/**
 * Detect gender from name using known female first-name markers.
 */
function detectGender(nama: string): 'L' | 'P' {
  const firstWord = nama.trim().split(/\s+/)[0].toLowerCase();
  const femalePrefixes = [
    'maria', 'rosa', 'yoanna', 'yohana', 'agnes', 'elisabeth', 'elisabet',
    'kristina', 'germana', 'indrianti', 'magdalena', 'septiana', 'oktavia',
    'natalia', 'dominika', 'estina', 'yufita', 'yosefina', 'emerensiana',
    'theresia', 'emiliana', 'fransiska', 'marselina', 'nikola', 'monica',
    'yosefa', 'philomena', 'pricilya', 'claudia', 'anastasia', 'bernadete',
    'katarina', 'yufinti', 'salfiana', 'perpetua', 'lois', 'philomena',
    'berna', 'anastasia', 'gabriela', 'veronika', 'yosefine', 'priscila',
  ];
  if (femalePrefixes.includes(firstWord)) return 'P';
  return 'L';
}

/**
 * Parse "Tempat, Tgl Lahir" string into [tempat, tanggal]
 */
function parseTtl(ttl: string): { tempat: string | null; tanggal: Date | null } {
  if (!ttl.trim()) return { tempat: null, tanggal: null };
  
  const monthMap: Record<string, number> = {
    januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
  };

  const match = ttl.match(/^(.+?),\s*(\d+)\s+(\w+)\s+(\d{4})$/);
  if (match) {
    const [, tempat, day, monthName, year] = match;
    const month = monthMap[monthName.toLowerCase()];
    if (month !== undefined) {
      return { tempat: tempat.trim(), tanggal: new Date(parseInt(year), month, parseInt(day)) };
    }
  }
  return { tempat: ttl.split(',')[0]?.trim() || ttl.trim(), tanggal: null };
}

/**
 * Parse "Tempat - Tahun Dadar" string into [tempat, tahun]
 */
function parseDadar(dadar: string): { tempat: string | null; tahun: string | null } {
  if (!dadar.trim()) return { tempat: null, tahun: null };
  const match = dadar.match(/^(.+?)\s*-\s*(\d{4})$/);
  if (match) {
    return { tempat: match[1].trim(), tahun: match[2] };
  }
  return { tempat: dadar.trim(), tahun: null };
}

/**
 * Build NRA from parts without DB query.
 */
function buildNra(kodeDistrik: string, kodeWilayah: string, kodeRanting: string, urut: number, tahunDadar: string): string {
  const d = kodeDistrik.replace(/^\D+/g, '') || '0000';
  const w = kodeWilayah.split('-').pop() || '00';
  const r = kodeRanting.split('-').pop() || '00';
  return `${d}-${w}${r}-${String(urut).padStart(3, '0')}-${tahunDadar}`;
}

async function main() {
  console.log('Memulai seed data anggota...');

  // ── 1. Setup Struktur Organisasi ──
  const nasional = await prisma.nasional.upsert({
    where: { kode: 'THS-NAS' },
    update: {},
    create: { kode: 'THS-NAS', nama: 'THS-THM Nasional' },
  });

  const distrik = await prisma.distrik.upsert({
    where: { kodeDistrik: 'DST-0114' },
    update: {},
    create: {
      nasionalId: nasional.id,
      kodeDistrik: 'DST-0114',
      nama: 'Distrik Flores Timur',
    },
  });

  const wilayah = await prisma.wilayah.upsert({
    where: { kodeWilayah: 'WLY-0114-01' },
    update: {},
    create: {
      distrikId: distrik.id,
      kodeWilayah: 'WLY-0114-01',
      nama: 'Wilayah Larantuka',
    },
  });

  const ranting = await prisma.ranting.upsert({
    where: { kodeRanting: 'RTG-0114-01' },
    update: {},
    create: {
      wilayahId: wilayah.id,
      kodeRanting: 'RTG-0114-01',
      nama: 'Sta. Maria Ratu Semesta Alam Hokeng',
      lokasiLatihan: 'Hokeng, Flores Timur',
    },
  });

  console.log(`Struktur organisasi: ${distrik.nama} › ${wilayah.nama} › ${ranting.nama}`);

  // ── 2. Check if members already exist ──
  const existingCount = await prisma.anggota.count({
    where: { rantingId: ranting.id, deletedAt: null },
  });
  if (existingCount > 0) {
    console.log(`Ranting "${ranting.nama}" sudah memiliki ${existingCount} anggota. Lewati seed.`);

    // Still update gender for existing members
    let updatedGender = 0;
    for (const [nama, nra] of membersData) {
      const gender = detectGender(nama);
      const exists = await prisma.anggota.findUnique({ where: { nomorAnggota: nra } });
      if (exists && exists.jenisKelamin !== gender) {
        await prisma.anggota.update({
          where: { nomorAnggota: nra },
          data: { jenisKelamin: gender },
        });
        updatedGender++;
      }
    }
    console.log(`   - Gender updated: ${updatedGender}`);
    return;
  }

  // ── 3. Get max existing sequence per tahunDadar ──
  const existingMembers = await prisma.anggota.findMany({
    where: { rantingId: ranting.id, deletedAt: null },
    select: { nomorAnggota: true, tahunDadar: true },
  });
  
  const maxSeqPerTahun: Record<string, number> = {};
  let globalMaxSeq = 0;
  for (const m of existingMembers) {
    const parts = m.nomorAnggota.split('-');
    const seq = parseInt(parts[parts.length - 2] || '0', 10);
    globalMaxSeq = Math.max(globalMaxSeq, seq);
    const tahun = m.tahunDadar || '0000';
    maxSeqPerTahun[tahun] = Math.max(maxSeqPerTahun[tahun] || 0, seq);
  }

  // ── 4. Import anggota (hanya untuk fresh database — existing sudah skip di langkah 2) ──
  let imported = 0;
  let incomplete = 0;

  for (const [nama, nra, ttl, dadar, _ranting, foto, tingkat] of membersData) {
    const gender = detectGender(nama);
    const { tempat: tempatLahir, tanggal: tanggalLahir } = parseTtl(ttl);
    const { tempat: tempatDadar, tahun: tahunDadar } = parseDadar(dadar);

    const missingFields: string[] = [];
    if (!tempatLahir) missingFields.push('tempat_lahir');
    if (!tanggalLahir) missingFields.push('tanggal_lahir');
    if (!tempatDadar) missingFields.push('tempat_dadar');
    if (!tahunDadar) missingFields.push('tahun_dadar');
    if (!tingkat) missingFields.push('tingkat');

    // Generate NRA in new format
    const tahun = tahunDadar || String(new Date().getFullYear());
    const seq = (maxSeqPerTahun[tahun] || globalMaxSeq) + 1;
    maxSeqPerTahun[tahun] = seq;
    const newNra = buildNra(distrik.kodeDistrik, wilayah.kodeWilayah, ranting.kodeRanting, seq, tahun);

    await prisma.anggota.create({
      data: {
        nomorAnggota: newNra,
        namaLengkap: nama,
        jenisKelamin: detectGender(nama),
        tempatLahir,
        tanggalLahir,
        tempatDadar,
        tahunDadar,
        fotoPath: foto || null,
        tingkat,
        rantingId: ranting.id,
        statusKeanggotaan: 'aktif',
        statusData: missingFields.length > 0 ? 'incomplete' : 'complete',
        statusValidasi: 'approved',
        missingFields: missingFields.length > 0 ? (missingFields as any) : undefined,
      },
    });

    if (missingFields.length > 0) incomplete++;
    imported++;
  }

  console.log(`\n✅ Import selesai:`);
  console.log(`   - Total: ${membersData.length} anggota`);
  console.log(`   - Imported: ${imported}`);
  console.log(`   - Data incomplete: ${incomplete}`);
  console.log(`   - Data complete: ${imported - incomplete}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
