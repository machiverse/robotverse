// Researched datasheet sources: official manufacturer PDFs found by web research, per model
// family. Every link is still downloaded and checked by the directory-datasheet function: it must
// be a real PDF on an approved manufacturer domain, and the exact model must appear in its text
// (or its file name). A family PDF therefore only ever attaches to the variants it really lists.
import type { DatasheetModel } from "./datasheetPolicy.ts";

/**
 * `match`: a family or model prefix ("IRB 6700" matches "IRB 6700-200/2.60", not "IRB 67000").
 * `trust`: research confirmed the PDF covers every variant of this family, but our catalogue names
 * them differently from the PDF (e.g. "CRB 15000 GoFa 12" vs "CRB 15000-12/1.27"), so the family
 * match is enough; the file must still be a real PDF on the manufacturer's domain.
 */
export type DatasheetSource = {
  match: string;
  urls: string[];
  trust?: boolean;
  /** Instead of a prefix: a case-insensitive pattern tested against the model (e.g. KUKA, whose names carry no family). */
  pattern?: string;
  /**
   * Manufacturer product pages whose linked PDFs (brochures, data sheets) are checked like `urls`.
   * "{slug}" is replaced by the model in lower case with dashes ("RS007N" → "rs007n").
   */
  pages?: string[];
  /** Removed from our model name before looking for it in the PDF text (e.g. "Smart5 " for older Comau names). */
  strip?: string;
  /**
   * For pattern sources: a regex whose first group is the model's series ("IR-S10" from
   * "IR-S10-60Z20S-INT"). A PDF naming the series is used when none names the exact variant.
   */
  family?: string;
};

export const DATASHEET_SOURCES: Record<string, DatasheetSource[]> = {
  ABB: [
    { match: "IRB 1200", urls: ["https://library.e.abb.com/public/6f866d55894a49a7b44384db76e01b4b/IRB1200_ROB0275EN_A.pdf", "https://library.e.abb.com/public/05bae8b556a5471595b1d0e4a76104eb/3HAC046982%20PS%20IRB%201200%20on%20IRC5-en.pdf?x-sign=Y8qWy5iWfYyvEFCVxFqybP7qM2l2y+HVr4oQLCXQ2NuIP9SxMBT2PcCNsl18nAhy"] },
    { match: "IRB 2600", urls: ["https://library.e.abb.com/public/a0e90912800f4ad2abfd1074e776aff4/Datenblatt_IRB2600_lowres.pdf?x-sign=Q0xwjalRH4qPqZzKyEkq8ZcUkmXGYJJnFaMShS1dt5ugTNrI9xsBaX16DGF2NKbQ", "https://library.e.abb.com/public/b158e2dcf8cc41b4a724eda1e22f87fb/3HAC035959%20PS%20IRB%202600%20on%20IRC5-en.pdf?x-sign=eFRwr5bvYiYCuEE4CG4KiECtDFV04Kg5PKLCzDcjMSxYVjaHCAKzABWVK1nMhLfV"] },
    { match: "IRB 2600ID", urls: ["https://library.e.abb.com/public/b158e2dcf8cc41b4a724eda1e22f87fb/3HAC035959%20PS%20IRB%202600%20on%20IRC5-en.pdf?x-sign=eFRwr5bvYiYCuEE4CG4KiECtDFV04Kg5PKLCzDcjMSxYVjaHCAKzABWVK1nMhLfV"] },
    { match: "IRB 4600", urls: ["https://library.e.abb.com/public/c97516887a8646968b6c339ad61c128a/IRB4600_ROB0109EN_J_datasheet-Rev.L.pdf?x-sign=d4kbQSGuUJ3FGc1cWKYcVpEGyoTMSUNP6nl7GUL7lqnm03k3qZW0KDftuphkd2oN", "https://library.e.abb.com/public/e8aea76a73a738e1c1257b130057a58c/ROB0109EN_F%20LR.pdf?x-sign=tjMiUCykhE+yfExS8a6WSmFiS7JnGRJ5rx7SWIEe8z4U2mUqMDBTXeTs5eSAMGgO"] },
    { match: "IRB 6640", urls: ["https://library.e.abb.com/public/7816f710075145eeafed025d636b5520/IRB6640-ROB001EN-Rev.L.pdf", "https://library.e.abb.com/public/1c8cd7d860ec46f7b4254c03dd238dd8/3HAC028284%20PS%20IRB%206640-en.pdf"] },
    { match: "IRB 6640ID", urls: ["https://library.e.abb.com/public/1c8cd7d860ec46f7b4254c03dd238dd8/3HAC028284%20PS%20IRB%206640-en.pdf"] },
    { match: "IRB 7600", urls: ["https://library.e.abb.com/public/149ea673a73f43da93bdc9caacf56ec9/IRB7600_datasheet_20231206.pdf", "https://library.e.abb.com/public/915cf53db781b841c1257b4400523bc8/Datasheet%20IRB%207600.pdf", "https://library.e.abb.com/public/ba5b8ead8d7b142fc1257b130057a5c4/PR10074%20EN_R9%20HR.pdf"] },
    { match: "IRB 1600", urls: ["https://library.e.abb.com/public/d2aab84b6958416689aaac343a6b0285/IRB+1600+datasheet_20240726.pdf?x-sign=CQVt1pKZ0N/jgJhJiOVkEIpmFh7kexNd4Z55VxR5kdgRXZAZhdWP8kd0LkEXCNrY", "https://library.e.abb.com/public/5fe2ad8dd07dd63bc1257b59004fd8aa/IRB%201600%20PR10282%20EN_R5.pdf", "https://library.e.abb.com/public/818d1922d857a640c1257cc500449f38/Product%20specifications_IRB1600_3HAC023604-001_revM_en.pdf"] },
    { match: "IRB 1600ID", urls: ["https://library.e.abb.com/public/696ac7757d994576a5ce71bc022a3056/3HAC023604%20PS%20IRB%201600-1660%20on%20IRC5-en.pdf?x-sign=RxKvRBOQUih8CpWkW2Nra6buSsI3SMqovxyT6YW9aAEzuGXGCGmHHYEzmz4ggSZF"] },
    { match: "IRB 6700", urls: ["https://library.e.abb.com/public/a2698bc8d34a36a048257d4000330712/IRB_6700_EN.pdf", "https://library.e.abb.com/public/3963df8a9b254840b2d73e0a173daddf/3HAC044265%20PS%20IRB%206700%20on%20IRC5-en.pdf?x-sign=G9Xh04l8v0QgrTS9fv7VISj0NSuiQE3E5HHA1oOTFkljaLUz4Sb0xSBK2HCrVkge"] },
    { match: "IRB 120", urls: ["https://library.e.abb.com/public/7aa0711a20fa41c49a8fdf3bbc3d5bb0/IRB120-Rev.J-ROBO149EN_D.pdf", "https://library.e.abb.com/public/7994e7a9604e4b8c98a92dd90be271e1/IRB%20120_Datasheet_US%20Letter.pdf", "https://library.e.abb.com/public/429d251dbce44b049ba7d6107a422de0/3HAC035960%20PS%20IRB%20120-en.pdf"], trust: true },
    { match: "IRB 1100", urls: ["https://library.e.abb.com/public/bdf0b25a165f40c4984d770bf110994b/IRB1100_datasheet.pdf"] },
    { match: "IRB 1300", urls: ["https://library.e.abb.com/public/cdf5b52f99e641d8a696fc5e406d494d/3HAC070393%20PS%20IRB%201300-en.pdf?x-sign=MhnTGkIcBA4wBdOPxwGL27nlVT4fjAHlDzqyYmUGsAqpRh5GJ1EQxb8hFmbAeqT3"] },
    { match: "CRB 1300", urls: ["https://library.e.abb.com/public/6d9d4922a58b4614a799dd22ff1eebb1/SWIFTI_CRB1300-datasheet_.pdf", "https://library.e.abb.com/public/0ddbccefebd64ce8bf74c825b2bdd385/3HAC083113%20PS%20CRB%201300-en.pdf?x-sign=txSPcGipL3KeaB8%2Fxfsd8TSRXCIhzewo2FCksWOnW9x9TfQgHTbzgUshMQQjLPyM"] },
    { match: "CRB 15000", urls: ["https://library.e.abb.com/public/da08b5dcb0134ec4ab2be13397c07f56/GoFa%20CRB%2015000%20Datasheet.pdf?x-sign=QoHQpzyzAym96ZO881iUeSqPK7F9aocMWbJoKu9VwyXuN78Z0una0Qlh3Lsn3gV9", "https://library.e.abb.com/public/54f8e59e101e4b1b9c34bf40ab034984/3HAC077390%20PS%20CRB%2015000-en.pdf?x-sign=DYdbffTtUgnoF33Aa9Z0vh3dyrDlKAExZwpwu3tNH6VHaHmTa6UtHVGxfIN10ps8"], trust: true },
    { match: "IRB 360", urls: ["https://library.e.abb.com/public/a3759d3f3e7141deba89d1caeb1dd4e4/IRB%20360%20FlexPicker_Datasheet_US%20Letter.pdf", "https://library.e.abb.com/public/1c971fb90d8c34f8c1257c2100468677/ROB0082EN_F_HR.pdf"], trust: true },
    { match: "IRB 1660ID", urls: ["https://library.e.abb.com/public/d2c51fcd6ada4ac99bb2815d6ffc25e3/IRB+1660ID+datasheet_20240726.pdf?x-sign=dXwzTJ5TwZspJbeTu1ZIvIsngmRP9cGW98I/H7lpFAWZELhxrDaJmh9biG6uHHB9", "https://library.e.abb.com/public/975619d6176f42369d01a47e9ad5ecd2/ROB0337EN_IRB_1660ID.pdf?x-sign=DnhInDz2AMhRFnuf1RNmBv3yy9Uv8sQ8p3vxI4t7WhjF%2BEvfXuL%2FlqOUEK0opGTc"], trust: true },
    { match: "IRB 1660", urls: ["https://library.e.abb.com/public/d526419c71ed4f3d8a7a0c59c8f2c731/3HAC023604%20PS%20IRB%201600-1660%20on%20IRC5-en.pdf?x-sign=QCGEJ/GAPgaLQY7KN0M3oKHXX22y3byZYtlKHvBQUVF6EHFhMQ2EgNTqKx25IMem"] },
    { match: "IRB 1520ID", urls: ["https://library.e.abb.com/public/8afae80b46614d93873b9867490e3a1a/IRB%201520ID%20datasheet_20240726.pdf?x-sign=rkYV5Pzg9usTISgNoOLncXCz3aahgufipaQp4SkYmbvmg%2BT6bf88oSP7P6TG%2BMLb", "https://library.e.abb.com/public/f17789c40d55103348257c760032995f/ROB0214EN_E_LR.pdf"], trust: true },
    { match: "IRB 460", urls: ["https://library.e.abb.com/public/ed4ca7c8f9744f248ebe07af192a2e59/IRB%20460_Datasheet_US%20Letter.pdf", "https://library.e.abb.com/public/8174696338914e98af7b2e8a9d449f12/3HAC039611%20PS%20IRB%20460%20on%20IRC5-en.pdf?x-sign=rHycYBP968GAnJCKYRrFVYpAwvJqUMib6v70ArAd3EK/yXCN76TvEG6McKZIzj1y"], trust: true },
    { match: "IRB 660", urls: ["https://library.e.abb.com/public/5485a884569b430894614a34ca93cc84/IRB660_PR10284EN_F_HR.pdf?x-sign=Bz6URh0aHrCaVMWl%2B%2BnRf%2FxBi3JZvZ9kHUL98wp7nVcZt%2BkNovSobU2hcEC0TzyR"] },
    { match: "IRB 760", urls: ["https://library.e.abb.com/public/e7acb3b487114f36a3ecf0b2f7e4f779/IRB+760_Datasheet_US+Letter.pdf?x-sign=gJatTj+%2Fpp8T0GMwaUzGV%2FpQ04CLi2WgQXwrSdvW%2FBqZnrbSgPJQYJB1KuXPUqLR"], trust: true },
    { match: "IRB 5710", urls: ["https://library.e.abb.com/public/0c41b545d5374db68d7ac8b7e5a0d779/9AKK108466A6229_en_B_IRB%205710%20datasheet%20pdf.pdf?x-sign=I%2FJkRIdNlgJ81Uy6fTJTDeA2ZTRXVJmpcfa5F3B5HvNcS2O1sScb3zapcv8Y4DY1", "https://library.e.abb.com/public/e1b3f97fa062425297818ece21134983/3HAC075188%20PS%20IRB%205710-en.pdf?x-sign=9iRxKtSbEAESKzqO2H9GPvAEYkzeZmj%2BcJNeCYekreVVw7A%2BAljwzVcQRJprXjmP"] },
    { match: "IRB 5720", urls: ["https://library.e.abb.com/public/0c41b545d5374db68d7ac8b7e5a0d779/9AKK108466A6229_en_B_IRB%205710%20datasheet%20pdf.pdf?x-sign=I%2FJkRIdNlgJ81Uy6fTJTDeA2ZTRXVJmpcfa5F3B5HvNcS2O1sScb3zapcv8Y4DY1"] },
    { match: "IRB 6600", urls: ["https://library.e.abb.com/public/10371719b9984224c125766d003e8d44/3HAC14064-1_revH_en_library.pdf", "https://library.e.abb.com/public/b93e2726298314b3c1257b130056d10a/IRB%206600%20R%20%20US%2002_05.pdf"], trust: true },
    { match: "IRB 6650", urls: ["https://library.e.abb.com/public/10371719b9984224c125766d003e8d44/3HAC14064-1_revH_en_library.pdf"] },
    { match: "IRB 6650S", urls: ["https://library.e.abb.com/public/802fd5435759ff22c1257b4b0051bc54/Datenblatt_IRB6650S_highres.pdf", "https://library.e.abb.com/public/10371719b9984224c125766d003e8d44/3HAC14064-1_revH_en_library.pdf"] },
    { match: "IRB 6660", urls: ["https://library.e.abb.com/public/a241061257154428be5f55f8edcfa67e/IRB6660_datasheet_20231206.pdf", "https://library.e.abb.com/public/4bc775cd7374c09ac1257bf30030c01a/ROB0053%20EN_D_HR.pdf"] },
    { match: "IRB 8700", urls: ["https://library.e.abb.com/public/166404d0ee6c484bae02495219738661/IRB%208700_Datasheet_US%20Letter.pdf", "https://library.e.abb.com/public/e46c208e08834e2ba37eb34f4be9c8d1/IRB8700_20211005_0226.pdf?x-sign=l5cxC+B8qJ3voeqEQEVqPyUZDqZ6biuEeP9tNYBTUPDZ6BxeqmUp37aViX/ayT4j"] },
    { match: "IRB 6620", urls: ["https://library.e.abb.com/public/5a067132a8b84cdd982ca4b95669adc5/IRB_6620_20211001.pdf"], trust: true },
    { match: "IRB 910SC", urls: ["https://library.e.abb.com/public/2ac1d57a1bf4431391aa558f27c99cf5/IRB910SC-revF-9AKK106713A1510.pdf", "https://library.e.abb.com/public/9fc170040463477db86bda7065135457/3HAC056431%20PS%20IRB%20910SC-en.pdf"] },
    { match: "IRB 920T", urls: ["https://library.e.abb.com/public/e52a49c7ae7c4f009734dc7a859de739/IRB%20920T%20datasheet_20220105.pdf?x-sign=vaihQ0Ty5jWEF7%2FdLgicDAdy5mh6SSBAqZWIKtyM0x8gwciQY7KWmmDhhVdQswkE"] },
    { match: "IRB 140", urls: ["https://library.e.abb.com/public/7a042a12d98d4e8ca8ff1bfe28597020/IRB%20140_Datasheet_US%20Letter.pdf", "https://library.e.abb.com/public/a7121292272d40a9992a50745fdaa3b2/3HAC041346%20PS%20IRB%20140-en.pdf", "https://library.e.abb.com/public/272e612a246ac57b48257c6f00372ddc/PR10031EN%20R14%20LR.pdf"], trust: true },
    { match: "IRB 1410", urls: ["https://library.e.abb.com/public/bd5c34fe8ec947b59200f72ae7dbf5b2/IRB_1410_datasheet_20221116_digital.pdf?x-sign=TyrNPsj7aUJnAH4GZLtL4RKEOz2cJZXhTpDZqeb9Ync3g7YZqs8FVcpTKZ3WAV99", "https://library.e.abb.com/public/3d6b51b2a76143d9ba74b81d81c281bd/3HAC026366%20PS%20IRB%201410-en.pdf"], trust: true },
    { match: "IRB 2400", urls: ["https://library.e.abb.com/public/0e99ce5105b84c14bd6eab2e793fcddb/IRB2400-PR10034EN-Rev.F.pdf", "https://library.e.abb.com/public/7ee62fc704b04002c1257b130056d125/IRB2400_R3_US%2002_05.pdf"], trust: true },
    { match: "IRB 4400", urls: ["https://library.e.abb.com/public/696f50f851a141cd8ada869ade48b742/3HAC9117-1_rev7_en_library.pdf", "https://library.e.abb.com/public/f8b8c4721404116cc1257b130056d106/IRB4400_R1_US%2002_05.pdf"], trust: true },
    { match: "IRB 5400", urls: ["https://library.e.abb.com/public/31f1d6f5dfba4b64a0c08b26dc76f7b2/IRB5400-datasheet-PR10269EN-revF.pdf", "https://library.e.abb.com/public/fee79d8b244ca79bc1257b130057a323/IRB%205400%20process%20datasheet.pdf"], trust: true },
    { match: "IRB 5500", urls: ["https://library.e.abb.com/public/be251c494f2641479edcae8b032201c8/IRB5500-Flex-RP50010EN-Rev.F.pdf?x-sign=H4AfztMUOKvsXe81vEP1Md8shQbRWjqrvnudgvJtzLiVMwIA2Uymu9dCtpXZ7el5"], trust: true },
    { match: "IRB 5510", urls: ["https://library.e.abb.com/public/ad75cc6948d3425ab56431443f627216/IRB-5510-datasheet-9AKK107046A7452-revD.pdf"], trust: true },
    { match: "YuMi IRB 14050", urls: ["https://library.e.abb.com/public/2fee99076bf240b68e292dcbbaec9a7d/IRB%2014050_YuMi_SingleArm-datasheet_digital_20210331.pdf"], trust: true },
    { match: "IRB 14050", urls: ["https://library.e.abb.com/public/2fee99076bf240b68e292dcbbaec9a7d/IRB%2014050_YuMi_SingleArm-datasheet_digital_20210331.pdf"], trust: true },
    { match: "YuMi IRB 14000", urls: ["https://library.e.abb.com/public/f8427dc41dd34f6fb8d75253bf90108d/9AKK107991A9242_en_C_Cobot%20family%20brochure%2C%20including%20CRB%201910%2C%20CRB%2015000%2C%20IRB%2014000%2C%20IRB%2014050.pdf?x-sign=xk%2Bz9g0Y%2BVGTh4ktSe1j5gl%2BSeY0%2FXuZ5HfrI3uHQNzn69a2O4FAFLdL0M9eHaeZ"], trust: true },
    { match: "IRB 1010", urls: ["https://library.e.abb.com/public/403e93a8cb5a48e0a7a4be399fbe05d5/3HAC081966%20PS%20IRB%201010-en.pdf?x-sign=ykwGmFULoKL7p002EafVmwd7a3L%2FkIejHOJ5DW5LAqswSxPLFYQYWQZmb3FDJlt3"] },
    { match: "IRB 260", urls: ["https://library.e.abb.com/public/fb46f286f05f4b5aa1d010a41fed5cac/IRB260-PR10285EN-Rev.I.pdf"], trust: true },
    { match: "PoWa CRB 1910", urls: ["https://library.e.abb.com/public/f483ca2542514c4dac43c21285470c7a/PoWa%20CRB1910_Datasheet.pdf?x-sign=DY9GJw15n637NQRToZwLztTAESLadeSFAPIlamixJrqjODPEhvIJhVLbDBSc1T0R", "https://library.e.abb.com/public/dc7c5d7b96ea42d487bf98e895e67ad1/PS%203HAC097944%20CRB%201910-en.pdf?x-sign=Nr6HrjQnAtCt9%2FiUZedNrpsm+%2FssRdP4ekZj2h+MjKzwWjQE1+Afhr9+Ru0a1N8S"], trust: true },
    { match: "IRB 580", urls: ["https://library.e.abb.com/public/bfaa0e99ec01456a8a656bc953407399/IRB580_PR10178EN_RevF.pdf"], trust: true },
    { match: "IRB 6400R", urls: ["https://library.e.abb.com/public/4b47c4bc123fe9e8c1257b4b0051f5a7/IRB_6400R_Rev3.pdf"], trust: true },
  ],
  // KUKA model names carry no family name ("KR 210 R2700-2" is a KR QUANTEC), so models are routed
  // by size to the family pages; each page's brochures and data sheets are then checked for the model.
  KUKA: [
    { match: "KR small and medium", urls: [], pattern: "^KR ?\\d+ (R[4-9]\\d\\d|R1\\d\\d\\d|R2[01]\\d\\d)|sixx|arc|cybertech|scara|^KR ?[345] ", pages: ["https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/kr-agilus", "https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/kr-cybertech", "https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/kr-cybertech-arc", "https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/kr-cybertech-nano", "https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/kr-scara-robot"] },
    { match: "KR large", urls: [], pattern: "^KR ?\\d+ (R2[2-9]\\d\\d|R3\\d\\d\\d|L\\d+)|prime|ultra|extra|nano|press|titan| PA\\b|comp|\\bHA\\b|IONTEC", pages: ["https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/kr-quantec", "https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/kr-quantec-extra", "https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/kr-quantec-pa", "https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/kr-fortec", "https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/kr-1000-titan", "https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/kr-titan-ultra", "https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/kr-iontec", "https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/kr-quantec-prime"] },
    { match: "KR5 scara", urls: ["https://www.kuka.com/-/media/kuka-downloads/imported/8350ff3ca11642998dbdc81dcc2ed44c/pf0056_kr_5_scara_en.pdf"] },
    { match: "LBR iiwa", urls: [], pages: ["https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/lbr-iiwa"] },
    { match: "iisy", urls: [], pages: ["https://www.kuka.com/en-us/products/robotics-systems/industrial-robots/lbr-iisy-cobot"] },
  ],
  // One product page per model, each linking its "Standard Specifications" sheet; lineup brochures as backup.
  Kawasaki: [
    { match: "Kawasaki", urls: ["https://kawasakirobotics.com/uploads/sites/2/2022/01/RS_EN_20250723.pdf", "https://kawasakirobotics.com/uploads/sites/2/2022/01/B_Z_E_221011.pdf", "https://kawasakirobotics.com/uploads/sites/2/2022/01/Palletizing_EN_240527.pdf", "https://kawasakirobotics.com/uploads/sites/2/2024/05/Lineup_EN_240527.pdf"], pattern: ".", pages: ["https://kawasakirobotics.com/products-robots/{slug}/"] },
    { match: "RS007N", urls: ["https://kawasakirobotics.com/uploads/sites/2/2022/01/specifications_robots_small-medium-payload-robots_rs_rs007n_en_01_2021.pdf"] },
    { match: "RS007L", urls: ["https://kawasakirobotics.com/uploads/sites/2/2022/01/specifications_robots_small-medium-payload-robots_rs_rs007l_en_01_2021.pdf"] },
    { match: "CP300L", urls: ["https://kawasakirobotics.com/uploads/sites/2/2022/01/CP300L-A-E-1.pdf"] },
    { match: "BA013L", urls: ["https://kawasakirobotics.com/uploads/sites/2/2022/10/90151-0386DED.pdf"], trust: true },
  ],
  // Comau's compact catalogues list every current model's data; older "Smart5" names drop the prefix.
  Comau: [
    { match: "Comau", urls: ["https://www.comau.com/wp-content/uploads/2025/07/Comau_Robotics_CompactCatalogue2025_EN.pdf", "https://www.comau.com/wp-content/uploads/2023/10/Comau_Robotics_Compact-Catalogue_2023.pdf", "https://www.comau.com/wp-content/uploads/2021/06/Comau_Compact_Catalogue_Robotics-1.pdf"], pattern: ".", strip: "^Smart5? " },
    { match: "N-220", urls: ["https://www.comau.com/wp-content/uploads/2022/04/Brochure-N-220-robot-web-HD.pdf"] },
  ],
  // MELFA product-line catalogue: specification tables for every RV/RH series robot.
  Mitsubishi: [
    { match: "MELFA", urls: ["https://dl.mitsubishielectric.com/dl/fa/document/catalog/robot/l-09139eng/l09139n.pdf", "https://dl.mitsubishielectric.com/dl/fa/document/catalog/robot/l-09139eng/l09139a.pdf"], pattern: "." },
  ],
  // Estun publishes robot-body operation instructions with specification tables (no separate data
  // sheets); each is attached only to models named inside it.
  Estun: [
    { match: "ER20-1780", urls: ["https://en.estun.com/static/upload/file/20250310/1741587303987685.pdf"] },
    { match: "Estun", urls: ["https://en.estun.com/static/upload/file/20250310/1741587303987685.pdf", "https://en.estun.com/static/upload/file/20240521/1716275668856580.pdf"], pattern: "^ER" },
  ],
  Staubli: [
    { match: "TX2-90", urls: ["https://www.staubli.com/content/dam/robotics/products/robots/tx2/TX2-90-6-axis-product-data-sheet-EN.pdf"] },
    { match: "TX2-60", urls: ["https://www.staubli.com/content/dam/robotics/products/robots/tx2/TX2-60-6-axis-product-data-sheet-EN.pdf"] },
    { match: "TX2-140", urls: ["https://www.staubli.com/content/dam/robotics/products/robots/tx2/TX2-140-160-datasheet-EN.pdf"] },
    { match: "TX2-160", urls: ["https://www.staubli.com/content/dam/robotics/products/robots/tx2/TX2-140-160-datasheet-EN.pdf"] },
    { match: "TS2 SCARA", urls: ["https://www.staubli.com/content/dam/robotics/products/robots/ts2/{model}-4-axis-product-data-sheet-EN.pdf", "https://www.staubli.com/content/dam/robotics/products/robots/ts2/{model}-4-axis-product-data-sheet-DE.pdf"], pattern: "^TS2-\\d+", strip: " .*$" },
    { match: "Staubli", urls: [], pattern: "^(TX2|TS2|TP80)", pages: ["https://www.staubli.com/global/en/robotics/products/industrial-robots/6-axis/{slug}.html", "https://www.staubli.com/global/en/robotics/products/industrial-robots/4-axis/{slug}.html"] },
  ],
  // Epson spec sheets on files.support.epson.com, one per series.
  Epson: [
    { match: "GX8", urls: ["https://files.support.epson.com/far/docs/scara_gx8_robot_specification_sheet_cpd-62188_final.pdf"], trust: true },
    { match: "LS6", urls: ["https://files.support.epson.com/far/docs/ls6_robot_specification_sheet_cpd-55426.pdf"], trust: true },
    { match: "T6", urls: ["https://files.support.epson.com/docid/cpd5/cpd55682.pdf"], trust: true },
    { match: "Epson", urls: ["https://files.support.epson.com/far/docs/epson_robot_specification_2023_catalog_cpd-54833r3.pdf"], pattern: ".", family: "^([A-Z]+\\d+)" },
  ],
  // One product page per model on www2.tm-robot.com ("Techman TM5S" → /en/tm5s/).
  "Techman Robot": [
    { match: "Techman", urls: [], pattern: ".", strip: "^Techman ", pages: ["https://www2.tm-robot.com/en/{slug}/"] },
  ],
  // Omron's TM cobot datasheets (Techman-built), current S series first.
  Omron: [
    { match: "Omron robots", urls: ["https://robotics.omron.com/wp-content/uploads/industrial-robots_i822-e1_14_1_csm1050308.pdf"], pattern: "^(eCobra|i4|iX3)", family: "^((eCobra|i4|iX3)[ -]?\\d+)" },
    { match: "TM", urls: ["https://robotics.omron.com/wp-content/uploads/TM-Collaborative-Robot-S-Series-Datasheet-RevB-202409.pdf", "https://assets.omron.eu/downloads/latest/datasheet/en/i837_collaborative_robots_datasheet_en.pdf", "https://assets.omron.com/m/265aa911102c2f30/original/TM12-TM14-Datasheet.pdf"], pattern: "^TM" },
  ],
  // Nachi: standard specification sheets per model, then the Total Robot catalogue.
  Nachi: [
    { match: "MZ04", urls: ["https://www.nachirobotics.com/wp-content/uploads/2017/05/MZ04_Specification.pdf"] },
    { match: "MZ07", urls: ["https://www.nachirobotics.com/wp-content/uploads/2017/05/MZ07_Specification-1.pdf", "https://www.nachirobotics.com/wp-content/uploads/2023/02/MZ07F-MZ07LF-1.pdf"] },
    { match: "Nachi", urls: ["https://www.nachirobotics.com/wp-content/uploads/2024/12/Total-Robot.pdf", "https://www.nachi-fujikoshi.co.jp/dcms_media/other/R7001E-24.pdf", "https://www.nachirobotics.com/wp-content/uploads/2023/02/MZ-Series-Catalog.pdf"], pattern: ".", family: "^([A-Z]+\\d+[A-Z]?)" },
  ],
  Rokae: [
    { match: "Rokae", urls: ["https://static.rokae.com/Downloads/DataSheet/ROKAE_xMate%20CR_EN.pdf", "https://static.rokae.com/Downloads/DataSheet/ROKAE_xMate%20SR_EN.pdf"], pattern: ".", family: "^([A-Z]+\\d+)" },
  ],
  INOVANCE: [
    { match: "Inovance", urls: ["https://portal-file.inovance.com/owfile/ProdDoc/CY/19120306-CY/A03/19120306-CY_A03_Inovance%20Robot%20Selection%20Guide_EN%2020251120_Web.pdf", "https://portal-file.inovance.com/owfile/ProdDoc/CY/19120415-CY/A02/19120415-CY_A02_INOVANCE%20ROBOT%20Selection%20Leaflet_20251120_Web.pdf"], pattern: ".", family: "^(IRS?\\d*-?[A-Z]*\\d+)" },
  ],
  // One tech sheet per model at a fixed address ("UR10e" → .../UR10e_techsheet_en.pdf).
  "Universal Robots": [
    { match: "UR", urls: ["https://www.universal-robots.com/manuals/EN/TechSheets/{model}_techsheet_pdf_online/{model}_techsheet_en.pdf", "https://www.universal-robots.com/manuals/EN/DataSheets/{model}_techsheet_pdf_online/{model}_techsheet_en.pdf"], pattern: "^UR\\d+e?$" },
    { match: "UR5e", urls: ["https://www.universal-robots.com/media/1807465/ur5e_e-series_datasheets_web.pdf"] },
    { match: "UR10e", urls: ["https://www.universal-robots.com/media/1807466/ur10e_e-series_datasheets_web.pdf"] },
  ],
  DUCO: [
    { match: "GCR", urls: ["https://www.ducorobots.com/upload/down/1742433511462650.pdf"], pattern: "^GCR", family: "^(GCR\\d+)" },
  ],
  // One product page per model, grouped by series ("M1013" → /m-series/m1013/); "White" is a colour option.
  "Doosan Robotics": [
    { match: "M series", urls: [], pattern: "^M\\d", strip: " White$", pages: ["https://www.doosanrobotics.com/en/product-solutions/product/m-series/{slug}/"] },
    { match: "H series", urls: [], pattern: "^H\\d", strip: " White$", pages: ["https://www.doosanrobotics.com/en/product-solutions/product/h-series/{slug}/"] },
    { match: "A series", urls: [], pattern: "^A\\d", strip: " White$", pages: ["https://www.doosanrobotics.com/en/product-solutions/product/a-series/{slug}/"] },
    { match: "E series", urls: [], pattern: "^E\\d", strip: " White$", pages: ["https://www.doosanrobotics.com/en/product-solutions/product/e-series/{slug}/"] },
    { match: "P series", urls: [], pattern: "^P\\d", strip: " White$", pages: ["https://www.doosanrobotics.com/en/product-solutions/product/p-series/{slug}/"] },
  ],
  // Brooks PreciseFlex: the series product pages link each series' technical datasheet.
  Brooks: [
    { match: "PreciseFlex c3", urls: ["https://manuals.brooks.com/getmedia/5cf9d3e9-c995-4cd1-a493-37898aedbea2/PreciseFlex-c3-datasheet,-prelim,-rev-x2.pdf"], pages: ["https://www.brooks.com/preciseflex-robots/preciseflex-c3-robot/"], trust: true },
    { match: "PreciseFlex c3x", urls: ["https://manuals.brooks.com/getmedia/5cf9d3e9-c995-4cd1-a493-37898aedbea2/PreciseFlex-c3-datasheet,-prelim,-rev-x2.pdf"], trust: true },
    { match: "PreciseFlex c5", urls: [], pages: ["https://www.brooks.com/preciseflex-robots/preciseflex-c5-robot/"] },
    { match: "PreciseFlex 400", urls: [], pages: ["https://www.brooks.com/preciseflex-robots/preciseflex-400/"] },
    { match: "PreciseFlex 3400", urls: [], pages: ["https://www.brooks.com/industrial-automation/collaborative-robots/preciseflex-3400/"] },
  ],
  // DENSO product sheets (two pages: features, specifications, dimensions) per series.
  Denso: [
    { match: "VS-068", urls: [], pages: ["https://www.densorobotics.com/download/vsa-068-087-series-product-sheet/"] },
    { match: "VS-087", urls: [], pages: ["https://www.densorobotics.com/download/vsa-068-087-series-product-sheet/"] },
    { match: "HS series", urls: [], pattern: "^HS0", family: "^(HS\\d+)", pages: ["https://www.densorobotics.com/download/hs-series-product-sheet/"] },
    { match: "HSR series", urls: [], pattern: "^HSR", family: "^(HSR\\d+)", pages: ["https://www.densorobotics.com/products/4-axis/hsr-series/"] },
    { match: "VP series", urls: [], pattern: "^VP-", pages: ["https://www.densorobotics.com/products/5-6-axis/vp-series/"] },
  ],
  // Shibaura SCARA catalogues, and one product page per model.
  "Shibaura Machine": [
    { match: "Shibaura", urls: ["https://www.shibaura-machine.co.jp/documents/en/product/robot/download/th/catalog/ROB-SCARA-EN-03.pdf", "https://www.shibaura-machine.co.jp/documents/en/product/robot/download/th/catalog/Generalcatalog_for_SCARA_robots_EN.pdf"], pattern: "^TH", family: "^(TH[EL]? ?\\d+)", pages: ["https://www.shibaura-machine.co.jp/en/product/robot/lineup/th/{model}.html", "https://www.shibaura-machine.co.jp/en/product/robot/lineup/th/{slug}.html"] },
  ],
  // OTC Daihen: the robotic welding systems brochure tabulates the FD series; collaborative FD-VC4 sheet.
  "OTC Daihen": [
    { match: "FD", urls: ["https://www.daihen-usa.com/wp-content/uploads/documents/OTC-5-Series-II-Robotic-Welding-2021.pdf"], pattern: "^FD-", family: "^(FD-[A-Z]+\\d+)" },
  ],
  // Siasun's GCR cobots are DUCO's (a Siasun company): DUCO's GCR series spec sheet.
  Siasun: [
    { match: "GCR", urls: ["https://www.ducorobots.com/upload/down/1742433511462650.pdf"], pattern: "^GCR", family: "^(GCR\\d+)" },
  ],
  // Schneider: one product datasheet per reference (LXMRL…), plus the Lexium Cobot catalogue.
  "Schneider Electric": [
    { match: "Lexium", urls: ["https://www.se.com/us/en/product/download-pdf/{model}", "https://www.se.com/uk/en/download/document/DIA7ED2220801EN/"], pattern: "^Lexium", strip: "^Lexium (Cobot|SCARA) " },
  ],
  // Adept robots are now Omron's: Viper datasheet and the industrial robotics catalogue.
  Adept: [
    { match: "Viper", urls: ["https://robotics.omron.com/wp-content/uploads/Viper_Series_Articulated_Robots_Datasheet_OMRON_Robotics.pdf", "https://assets.omron.com/m/1df4491292d2f3b4/original/Articulated-Robot-Viper-650-850-Datasheet.pdf"], trust: true },
    { match: "Adept", urls: ["https://robotics.omron.com/wp-content/uploads/industrial-robots_i822-e1_14_1_csm1050308.pdf"], pattern: ".", family: "^((e?Cobra|Viper|Six) ?s?\\d+)" },
  ],
  // Dobot: one product page per model, each with a "Download product information" PDF.
  Dobot: [
    { match: "CR", urls: [], pattern: "^CR\\d+[A-Z]?$", pages: ["https://www.dobot-robots.com/products/cr-series/{slug}.html", "https://www.dobot-robots.com/products/cra-series/{slug}.html"] },
    { match: "Nova", urls: [], pattern: "^Nova", pages: ["https://www.dobot-robots.com/products/nova-series/{slug}.html", "https://www.dobot-robots.com/products/nova-series/dobot-nova-series.html"] },
    { match: "MG400", urls: [], pages: ["https://www.dobot-robots.com/products/desktop-four-axis/mg400.html"] },
  ],
  // Brand brochure and download pages: their official PDFs are checked for each model's series.
  "Hyundai Robotics": [
    { match: "Hyundai", urls: [], pattern: ".", family: "^([A-Z]+\\d+)", pages: ["https://www.hyundai-robotics.com/english/publicity/publicity4.html"] },
  ],
  "Elite Robots": [
    { match: "Elite", urls: [], pattern: ".", family: "^([A-Z]+\\d+)", pages: ["https://www.eliterobots.com/cobots/{slug}", "https://www.eliterobots.com/download"] },
  ],
  AUBO: [
    { match: "AUBO", urls: [], pattern: ".", family: "^(AUBO-[a-zA-Z]+\\d+)", pages: ["https://www.aubo-cobot.com/public/download4", "https://www.aubo-cobot.com/public/download3"] },
  ],
  // JAKA: one product page per model ("Zu12" → /productDetails/JAKA_Zu12).
  JAKA: [
    { match: "JAKA", urls: [], pattern: ".", pages: ["https://www.jaka.com/en/productDetails/JAKA_{model}"] },
  ],
  Neura: [
    { match: "LARA", urls: [], pages: ["https://neura-robotics.com/products/lara/"] },
    { match: "MAiRA", urls: [], pages: ["https://neura-robotics.com/products/maira/"] },
  ],
  HIWIN: [
    { match: "HIWIN", urls: ["https://www.hiwin.com/wp-content/uploads/HIWIN-Robots-Catalog.pdf", "https://www.hiwin.com/pdf/multi_axis_robot.pdf"], pattern: ".", family: "^(R[AT]\\d+)" },
  ],
  // xArm technical specification (xArm 5, 6 and 7).
  uFactory: [
    { match: "xArm", urls: ["https://download.ufactory.cc/xarm/en/Specification%20for%20xArm_20191021.pdf"], pattern: "^xArm", trust: true },
  ],
  "Rainbow Robotics": [
    { match: "RB", urls: [], pattern: "^RB", family: "^(RB\\d+)", pages: ["https://rainbow-robotics.com/en/download/", "https://rainbow-robotics.com/en/customer-support/resources/"] },
  ],
  FAIRINO: [
    { match: "FR", urls: [], pattern: "^FR", family: "^(FR\\d+)", pages: ["https://www.frtech.fr/DOWNLOAD2"] },
  ],
  "Kassow Robots": [
    { match: "KR", urls: [], pattern: "^KR", pages: ["https://www.kassowrobots.com/products/{slug}/", "https://www.kassowrobots.com/products/new-models"] },
  ],
  Neuromeka: [
    { match: "Indy", urls: [], pattern: ".", pages: ["https://en.neuromeka.com/download"] },
  ],
  // Panasonic welding robot catalogues (TM/TL/TS/TA manipulators).
  Panasonic: [
    { match: "Panasonic", urls: ["https://industrial.panasonic.com/content/data/WS/PDF/201609_TMTL-G3_E.pdf", "https://industrial.panasonic.com/content/data/WS/PDF/201801_TAWERS_E.pdf", "https://industrial.panasonic.com/content/data/WS/PDF/WeldingRobots_E.pdf"], pattern: ".", family: "^(T[AMLS]-\\d+)" },
  ],
  Kinova: [
    { match: "Gen3 lite", urls: ["https://www.kinovarobotics.com/uploads/Kinova_Onepager_Gen3-Lite_2024_EN_2024-07-11-171759_yykn.pdf"], trust: true },
    { match: "Gen3", urls: ["https://www.kinovarobotics.com/uploads/Kinova_Onepager_Gen3_2026_EN.pdf", "https://www.kinovarobotics.com/uploads/Kinova_Onepager_Gen3_2024_EN.pdf"], trust: true },
  ],
  Flexiv: [
    { match: "Rizon", urls: ["https://flexiv.com/uploaded/en/resource/file/2023/09/12/aazvzwrlzy.pdf"], pattern: "^Rizon", family: "^(Rizon \\d+)" },
  ],
  // Delta D-Bot DC series one-pager and cobot booklet.
  "Delta Electronics": [
    { match: "DC", urls: ["https://landing.deltaww.com/IA/downloadcenter/catalogue/10.Smart-System/D-BOT/102025_Cobot_OnePager_ENG.pdf", "https://landing.deltaww.com/IA/downloadcenter/catalogue/10.Smart-System/D-BOT/202510_Booklet_Cobot_EN.pdf"], pattern: "^DC\\d+" },
  ],
  // FANUC: the model's own datasheet first (FANUC America's fixed address), then series and general catalogues.
  Fanuc: [
    { match: "Fanuc", urls: ["https://www.fanucamerica.com/uploads/files/data-sheets/{slug}-datasheet.pdf", "https://www.fanuc.co.jp/en/product/catalog/pdf/robot/RR-2000iC(E)-09a.pdf", "https://www.fanuc.co.jp/en/product/catalog/pdf/robot/RM-900iB(E)-09.pdf", "https://www.fanuc.co.jp/en/product/catalog/pdf/robot/ARCMate(E)-01.pdf", "https://www.fanucamerica.com/cmsmedia/datasheets/LR%20Mate%20200iC%20Series_10.pdf", "https://www.fanucamerica.com/cmsmedia/datasheets/M-420iA%20Series_16.pdf", "https://www.fanucamerica.com/cmsmedia/datasheets/Compact%20CR%20line%20up%20product%20information_251.pdf", "https://www.fanuc.co.jp/en/product/catalog/pdf/robot/Robot_General(E)-05.pdf", "https://www.fanucamerica.com/docs/default-source/default-document-library/2024-robot-product-overview-brochure.pdf"], pattern: ".", family: "^((?:LR Mate |ARC Mate )?[A-Z]+-?\\d+i[A-Z])" },
  ],
};

const slug = (text: string) => text.toLowerCase().normalize("NFKC").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Researched PDFs for this model: exact-model entries first, then the longest family match. */
/**
 * `fallback`: from a pattern source (broad brochures), checked after the model's own pages.
 * `family`: the family name the PDF was researched for, used when no PDF names the exact variant.
 */
export function researchedSources(item: DatasheetModel): { url: string; trust: boolean; page?: boolean; fallback?: boolean; family?: string; strip?: string }[] {
  const model = slug(item.m);
  const hits = (DATASHEET_SOURCES[item.b] ?? [])
    .map((source) => ({ source, key: slug(source.match) }))
    .filter(({ source, key }) => source.pattern
      ? new RegExp(source.pattern, "i").test(item.m)
      : key && (model === key || (model.startsWith(key) && model[key.length] === "-")))
    .sort((a, b) => Number(!!a.source.pattern) - Number(!!b.source.pattern) || b.key.length - a.key.length);
  const out = new Map<string, { trust: boolean; page?: boolean; fallback?: boolean; family?: string; strip?: string }>();
  for (const { source } of hits) {
    // "{model}": our model name as written, spaces removed ("UR10e"); "{slug}": lower case with dashes.
    const name = source.strip ? item.m.replace(new RegExp(source.strip, "i"), "").trim() : item.m;
    for (const template of source.urls) {
      const url = template.replaceAll("{model}", encodeURIComponent(name.replace(/\s+/g, ""))).replaceAll("{slug}", slug(name));
      const known = out.get(url);
      const series = source.family ? item.m.match(new RegExp(source.family, "i"))?.[1] : undefined;
      const family = known ? known.family : source.pattern ? series : source.match;
      out.set(url, { trust: (known?.trust ?? false) || !!source.trust, ...(known || !source.pattern ? {} : { fallback: true }), ...(family ? { family } : {}), ...(source.strip ? { strip: source.strip } : {}) });
    }
    for (const page of source.pages ?? []) {
      const url = page.replaceAll("{slug}", slug(name)).replaceAll("{model}", encodeURIComponent(name.replace(/\s+/g, "")));
      if (!out.has(url)) out.set(url, { trust: false, page: true });
    }
  }
  return [...out].map(([url, flags]) => ({ url, ...flags }));
}
export const researchedUrls = (item: DatasheetModel) => researchedSources(item).map((source) => source.url);
